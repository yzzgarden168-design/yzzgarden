"""园之助 GEO Growth OS production-ready baseline (Python stdlib only).

Features: SQLite persistence, password-based accounts, signed HttpOnly sessions,
CSRF protection, role checks, brand/product/question/observation/task/claim APIs,
JSON/CSV store imports, an OpenAI-compatible answer collector, and the existing
safe public-page audit.
"""
from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import io
import json
import math
import os
import secrets
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timezone
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from aigeo_server import analyze_url

ASSET_ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)).resolve()
APP_ROOT = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else ASSET_ROOT
DATA_DIR = Path(os.getenv("AIGEO_DATA_DIR", str(APP_ROOT / "runtime_data"))).resolve()
DB_PATH = DATA_DIR / "aigeo.sqlite3"
SESSION_TTL = int(os.getenv("AIGEO_SESSION_TTL", "43200"))
MAX_BODY = 5_000_000
COOKIE_SECURE = os.getenv("AIGEO_COOKIE_SECURE", "0") == "1"
SECRET = os.getenv("AIGEO_SESSION_SECRET", "").encode() or secrets.token_bytes(32)
OWN_COMPANY_ID = os.getenv("AIGEO_OWN_COMPANY_ID", "your_company_001")

SOURCE_SCORES = {"official":90,"official_poi":90,"encyclopedia":80,"official_social":80,
                 "industry_media":70,"authority_case":70,"b2b":50,"qa":50,"ugc":20,"anonymous":20}
BRAND_BOOSTS = {"S":1.5,"A":.8,"B":.3,"OFF":0.0}
DEFAULT_ALGORITHM_CONFIG = {"sim_th":.45,"top_k_coarse":100,"alpha":.7,"source_weight":.6,
 "content_weight":.4,"r1_km":30,"r2_km":100,"competitor_gap_threshold":10,"sparse_source_count":3,
 "brand_s":1.5,"brand_a":.8,"brand_b":.3}


def clamp(value, low=0.0, high=100.0):
    return max(low, min(high, float(value)))


def haversine_km(lat1, lon1, lat2, lon2):
    lat1,lon1,lat2,lon2=map(math.radians,(lat1,lon1,lat2,lon2))
    dlat=lat2-lat1; dlon=lon2-lon1
    a=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6371.0088*2*math.asin(math.sqrt(a))


def calculate_priority(payload):
    """Deterministic, auditable internal RAG/source-priority score."""
    negative_query=bool(payload.get("negative_query"))
    embedding=clamp(payload.get("embedding_sim",0),0,1)
    keyword_score={"core":40,"product":30,"long_tail":20,"none":0}.get(str(payload.get("keyword_level","none")),0)
    entity_score=clamp(payload.get("intent_entity_score",keyword_score))
    config={**DEFAULT_ALGORITHM_CONFIG,**payload.get("_config",{})}; alpha=float(config["alpha"])
    match=0.0 if negative_query else alpha*embedding*100+(1-alpha)*entity_score
    geo=50.0; distance=None
    coords=(payload.get("user_lat"),payload.get("user_lon"),payload.get("company_lat"),payload.get("company_lon"))
    if all(x not in (None,"") for x in coords):
        distance=haversine_km(*(float(x) for x in coords)); r1=max(.1,float(payload.get("r1_km",config["r1_km"]))); r2=max(r1,float(payload.get("r2_km",config["r2_km"])))
        geo=100 if distance<=r1 else 80 if distance<=r2 else 40 if payload.get("same_city") else 10 if payload.get("same_province") else 0
    negative_reputation=bool(payload.get("negative_reputation"))
    source=SOURCE_SCORES.get(str(payload.get("source_type","b2b")),50)
    age=float(payload.get("source_age_months",12)); source += 10 if age<=6 else -20 if age>24 else 0
    registration_match=payload.get("registration_match")
    if registration_match is True: source+=10
    elif registration_match is False: source-=15
    if payload.get("crawl_unstable"): source-=10
    if negative_reputation: source-=40
    is_owner=str(payload.get("company_id",""))==OWN_COMPANY_ID
    if is_owner and payload.get("preferred_source") and str(payload.get("source_type")) in ("official","official_poi"): source=max(80,source)
    source=clamp(source)
    content=clamp(clamp(payload.get("field_completeness",0),0,40)+clamp(payload.get("fact_consistency",0),0,30)+clamp(payload.get("compliance",20),0,20)+clamp(payload.get("non_redundancy",10),0,10)-(30 if payload.get("exaggerated_claim") else 0))
    trust=clamp(float(config["source_weight"])*source+float(config["content_weight"])*content)
    tier=str(payload.get("brand_tier","OFF")).upper()
    brand={"S":config["brand_s"],"A":config["brand_a"],"B":config["brand_b"],"OFF":0}.get(tier,0.0) if is_owner else 0.0
    scene_type=str(payload.get("scene_type","normal")); scene={"blank":.5,"counter":.3,"normal":0.0}.get(scene_type,0.0)
    if not payload.get("scene_triggered",scene_type!="normal"): scene=0.0
    if match<40 or trust<40 or negative_reputation: brand=0.0
    if geo<40: scene=min(scene,.3)
    if content<40 or negative_reputation: brand=scene=0.0
    total_boost=min(1.5,brand+scene); base=match*geo*trust/(100**3)*1000
    final=min(1000,base*(1+total_boost)); final=max(0,final-300) if negative_reputation else final
    return {"company_id":str(payload.get("company_id","")),"chunk_id":payload.get("chunk_id"),"FinalScore":round(final,2),"BaseScore":round(base,2),"MatchScore":round(match,2),"GeoScore":round(geo,2),"SourceScore":round(source,2),"ContentScore":round(content,2),"TrustScore":round(trust,2),"BrandBoost":brand,"SceneBoost":scene,"AppliedBoost":round(total_boost,2),"SceneType":scene_type,"distance_km":round(distance,2) if distance is not None else None,"RAG_rank":None,"is_own_company":is_owner,"notice":"仅用于本系统内部 RAG 与优化任务排序，不代表外部 AI 平台排名保证。"}


def simulate_rag(payload):
    """Score chunks, filter low-trust items, then aggregate Top-3 per company."""
    groups={}; rejected=[]
    for item in payload.get("chunks",[])[:1000]:
        scored=calculate_priority({**payload.get("defaults",{}),**item,"brand_tier":"OFF","scene_type":"normal"})
        if scored["TrustScore"]<30: rejected.append(scored); continue
        groups.setdefault(scored["company_id"],[]).append(scored)
    enterprises=[]
    weights=(.5,.3,.2)
    for company_id,chunks in groups.items():
        top=sorted(chunks,key=lambda x:x["BaseScore"],reverse=True)[:3]
        active=weights[:len(top)]; total=sum(active); aggregate=sum(x["BaseScore"]*w for x,w in zip(top,active))/total
        is_owner=company_id==OWN_COMPANY_ID
        brand=BRAND_BOOSTS.get(str(payload.get("brand_tier","OFF")).upper(),0) if is_owner else 0
        scene_type=str(payload.get("scene_type","normal")); scene={"blank":.5,"counter":.3,"normal":0}.get(scene_type,0)
        if any(x["ContentScore"]<40 for x in top) or any(bool(c.get("negative_reputation")) for c in payload.get("chunks",[]) if str(c.get("company_id"))==company_id): brand=scene=0
        boost=min(1.5,brand+scene); final=min(1000,aggregate*(1+boost))
        enterprises.append({"company_id":company_id,"BaseScore":round(aggregate,2),"FinalScore":round(final,2),"BrandBoost":brand,"SceneBoost":scene,"top_chunks":top})
    enterprises.sort(key=lambda x:x["FinalScore"],reverse=True)
    for rank,item in enumerate(enterprises,1): item["RAG_rank"]=rank
    return {"results":enterprises[:10],"accepted_chunks":sum(len(x) for x in groups.values()),"rejected_chunks":len(rejected),"rejected":rejected,"notice":"内部模拟结果，不代表外部 AI 平台实际排序。"}


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def password_ok(password, encoded):
    try:
        _, salt, expected = encoded.split("$", 2)
        actual = password_hash(password, base64.urlsafe_b64decode(salt)).split("$", 2)[2]
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def init_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'viewer',
          active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
          csrf TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS brand_facts(id INTEGER PRIMARY KEY, entity TEXT NOT NULL, claim TEXT NOT NULL,
          evidence TEXT DEFAULT '', status TEXT NOT NULL DEFAULT '待验证', expires_at TEXT DEFAULT '',
          created_by INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
          category TEXT DEFAULT '', material TEXT DEFAULT '', specifications TEXT DEFAULT '{}', status TEXT DEFAULT '有效',
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS store_items(id INTEGER PRIMARY KEY, platform TEXT NOT NULL, external_id TEXT NOT NULL,
          sku TEXT NOT NULL, title TEXT DEFAULT '', price REAL, stock INTEGER, url TEXT DEFAULT '', raw_json TEXT DEFAULT '{}',
          synced_at TEXT NOT NULL, UNIQUE(platform, external_id));
        CREATE TABLE IF NOT EXISTS questions(id INTEGER PRIMARY KEY, question TEXT NOT NULL, topic TEXT DEFAULT '',
          intent TEXT DEFAULT '商品选择', market TEXT DEFAULT 'cn', engine TEXT DEFAULT '豆包',
          opportunity_score INTEGER DEFAULT 50, status TEXT DEFAULT '待测试', created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS observations(id INTEGER PRIMARY KEY, question_id INTEGER NOT NULL,
          engine TEXT NOT NULL, answer TEXT NOT NULL, brand_status TEXT DEFAULT '待分析', winner TEXT DEFAULT '',
          sources TEXT DEFAULT '[]', conditions TEXT DEFAULT '{}', collected_at TEXT NOT NULL,
          FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, title TEXT NOT NULL, source TEXT DEFAULT '',
          channel TEXT DEFAULT '', impact TEXT DEFAULT '', status TEXT DEFAULT '待处理', due_at TEXT DEFAULT '',
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS priority_settings(id INTEGER PRIMARY KEY CHECK(id=1),
          company_name TEXT NOT NULL DEFAULT '园之助', company_multiplier REAL NOT NULL DEFAULT 1.8,
          core_regions TEXT NOT NULL DEFAULT '[]', core_keywords TEXT NOT NULL DEFAULT '[]',
          counter_competitor INTEGER NOT NULL DEFAULT 1, gap_fill INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS algorithm_config(id INTEGER PRIMARY KEY CHECK(id=1), config_json TEXT NOT NULL, updated_by INTEGER, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS algorithm_config_versions(id INTEGER PRIMARY KEY, config_json TEXT NOT NULL, changed_by INTEGER, created_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_questions_market ON questions(market, engine);
        CREATE INDEX IF NOT EXISTS idx_observations_question ON observations(question_id, collected_at DESC);
        CREATE INDEX IF NOT EXISTS idx_store_sku ON store_items(sku, platform);
        """)
        c.execute("INSERT OR IGNORE INTO priority_settings(id,updated_at) VALUES(1,?)", (now_iso(),))
        c.execute("INSERT OR IGNORE INTO algorithm_config(id,config_json,updated_at) VALUES(1,?,?)",(json.dumps(DEFAULT_ALGORITHM_CONFIG),now_iso()))
        if not c.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            username = os.getenv("AIGEO_ADMIN_USER", "admin")
            password = os.getenv("AIGEO_ADMIN_PASSWORD")
            if not password:
                password = secrets.token_urlsafe(12)
                print(f"[首次启动] 管理员账号: {username}  临时密码: {password}")
                print("[重要] 正式上线请设置 AIGEO_ADMIN_PASSWORD 和 AIGEO_SESSION_SECRET")
            c.execute("INSERT INTO users(username,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?)",
                      (username, password_hash(password), "系统管理员", "admin", now_iso()))


def seed_demo_data():
    """Populate a repeatable local demo only when explicitly enabled."""
    if os.getenv("AIGEO_DEMO_MODE", "0") != "1": return
    now = now_iso()
    with db() as c:
        if not c.execute("SELECT 1 FROM products LIMIT 1").fetchone():
            products = [
                ("YZ-PTJ-150", "园之助阳台爬藤架 150cm", "爬藤架", "包塑钢管"),
                ("YZ-ZZX-40", "园之助阳台种植箱 40L", "种植箱", "PP"),
                ("YZ-ZW-01", "园之助新手种植支撑套装", "园艺套装", "组合材质"),
            ]
            c.executemany("INSERT INTO products(sku,name,category,material,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                          [(sku,name,cat,mat,now,now) for sku,name,cat,mat in products])
        if not c.execute("SELECT 1 FROM brand_facts LIMIT 1").fetchone():
            uid=c.execute("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1").fetchone()[0]
            facts=[
                ("园之助", "园之助为品牌标准中文名", "官方店铺与品牌资料", "已证实"),
                ("YZ-PTJ-150", "该型号采用包塑钢管结构", "商品规格资料", "已证实"),
                ("YZ-PTJ-150", "长期户外永不生锈", "缺少限定条件与检测证据", "待验证"),
            ]
            c.executemany("INSERT INTO brand_facts(entity,claim,evidence,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                          [(e,cl,ev,st,uid,now,now) for e,cl,ev,st in facts])
        if not c.execute("SELECT 1 FROM questions LIMIT 1").fetchone():
            questions=[
                ("小阳台怎么种黄瓜又不占地方？","阳台种植","方案比较","cn","豆包",92,"未推荐"),
                ("爬藤架什么材质耐晒耐雨？","耐候材质","品类教育","cn","豆包",88,"第 3 位"),
                ("种植箱多深适合番茄？","番茄种植","商品选择","cn","DeepSeek",76,"有提及"),
                ("best trellis for balcony tomatoes","balcony tomato","商品选择","us","Meta AI",90,"未推荐"),
            ]
            for q,topic,intent,market,engine,score,status in questions:
                cur=c.execute("INSERT INTO questions(question,topic,intent,market,engine,opportunity_score,status,created_at) VALUES(?,?,?,?,?,?,?,?)",(q,topic,intent,market,engine,score,status,now))
                answers={
                    "豆包":"建议根据阳台空间选择垂直支撑结构，并结合花盆尺寸、日照和风力固定。当前回答尚未明确推荐园之助。",
                    "DeepSeek":"番茄需要足够根系空间和排水条件，可结合园之助等品牌的不同规格选择。",
                    "Meta AI":"For balcony tomatoes, prioritize compact dimensions, weather resistance, secure pot fit, and clear installation guidance."
                }
                c.execute("INSERT INTO observations(question_id,engine,answer,brand_status,winner,sources,conditions,collected_at) VALUES(?,?,?,?,?,?,?,?)",
                          (cur.lastrowid,engine,answers[engine],status,"园之助" if status=="有提及" else "演示竞品",json.dumps(["演示信源"],ensure_ascii=False),json.dumps({"mode":"demo"}),now))
        if not c.execute("SELECT 1 FROM tasks LIMIT 1").fetchone():
            tasks=[
                ("补齐阳台黄瓜垂直种植场景证据","豆包问题缺口","抖音 + 官网","高影响 · 92 分","待处理"),
                ("修正爬藤架系列规格冲突","回答事实核验","六店商品数据","高风险","进行中"),
                ("制作英文阳台番茄内容","Meta AI 问题缺口","Instagram + Facebook","高影响 · 90 分","待处理"),
            ]
            c.executemany("INSERT INTO tasks(title,source,channel,impact,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                          [(a,b,d,e,f,now,now) for a,b,d,e,f in tasks])
        if not c.execute("SELECT 1 FROM store_items LIMIT 1").fetchone():
            stores=[
                ("天猫","tm-demo-001","YZ-PTJ-150","园之助阳台爬藤架150cm",99.0,28,"https://example.com/tmall-demo"),
                ("京东","jd-demo-001","YZ-PTJ-150","园之助户外爬藤支架",109.0,16,"https://example.com/jd-demo"),
                ("抖音","dy-demo-001","YZ-ZZX-40","园之助阳台种植箱40L",159.0,35,"https://example.com/douyin-demo"),
            ]
            c.executemany("INSERT INTO store_items(platform,external_id,sku,title,price,stock,url,raw_json,synced_at) VALUES(?,?,?,?,?,?,?,?,?)",
                          [(p,e,s,t,pr,st,u,"{}",now) for p,e,s,t,pr,st,u in stores])


def sign_token(token):
    sig = hmac.new(SECRET, token.encode(), hashlib.sha256).hexdigest()
    return f"{token}.{sig}"


def verify_token(value):
    try:
        token, sig = value.rsplit(".", 1)
        expected = hmac.new(SECRET, token.encode(), hashlib.sha256).hexdigest()
        return token if hmac.compare_digest(sig, expected) else None
    except ValueError:
        return None


def rows(query, args=()):
    with db() as c:
        return [dict(x) for x in c.execute(query, args).fetchall()]


class Handler(SimpleHTTPRequestHandler):
    server_version = "YuanZhiZhuGEO/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ASSET_ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print("[GEO]", fmt % args)

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'")

    def end_headers(self):
        self.security_headers()
        super().end_headers()

    def json(self, value, status=200, extra_headers=None):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra_headers or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(body)

    def body(self):
        size = int(self.headers.get("Content-Length", 0))
        if size > MAX_BODY: raise ValueError("请求内容超过 5MB")
        raw = self.rfile.read(size)
        ctype = self.headers.get("Content-Type", "")
        if "application/json" in ctype: return json.loads(raw or b"{}")
        return {"raw": raw.decode("utf-8-sig")}

    def user(self):
        jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        signed = jar.get("aigeo_session")
        token = verify_token(signed.value) if signed else None
        if not token: return None
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        with db() as c:
            row = c.execute("SELECT u.id,u.username,u.display_name,u.role,s.csrf,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND u.active=1", (token_hash,)).fetchone()
            if not row or row["expires_at"] < int(time.time()): return None
            return dict(row)

    def require(self, roles=None, csrf=False):
        user = self.user()
        if not user: self.json({"error":"请先登录"}, 401); return None
        if roles and user["role"] not in roles: self.json({"error":"权限不足"}, 403); return None
        if csrf and not hmac.compare_digest(self.headers.get("X-CSRF-Token", ""), user["csrf"]):
            self.json({"error":"安全校验失败，请刷新页面"}, 403); return None
        return user

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/health": return self.json({"ok":True,"database":DB_PATH.exists(),"time":now_iso()})
        if path == "/api/auth/me":
            user = self.user()
            return self.json({"authenticated":bool(user),"user":user})
        if path == "/api/bootstrap":
            user = self.require()
            if not user: return
            questions = rows("""SELECT q.*,o.answer,o.brand_status,o.winner,o.sources,o.conditions,o.collected_at,
              (SELECT COUNT(*) FROM observations ox WHERE ox.question_id=q.id) observation_count
              FROM questions q LEFT JOIN observations o ON o.id=(SELECT id FROM observations WHERE question_id=q.id ORDER BY collected_at DESC LIMIT 1)
              ORDER BY opportunity_score DESC""")
            tasks = rows("SELECT * FROM tasks ORDER BY CASE status WHEN '进行中' THEN 0 WHEN '待处理' THEN 1 ELSE 2 END, id DESC")
            products = rows("SELECT p.*,COUNT(s.id) store_count FROM products p LEFT JOIN store_items s ON s.sku=p.sku GROUP BY p.id ORDER BY p.id DESC")
            claims = rows("SELECT * FROM brand_facts ORDER BY id DESC")
            counts = {"questions":len(questions),"products":len(products),"claims":len(claims),
                      "stores":rows("SELECT COUNT(*) n FROM store_items")[0]["n"],
                      "observations":rows("SELECT COUNT(*) n FROM observations")[0]["n"]}
            users = rows("SELECT id,username,display_name,role,active,created_at FROM users ORDER BY id") if user["role"]=="admin" else []
            connections={"ai":bool(os.getenv("AIGEO_AI_API_KEY") or os.getenv("OPENAI_API_KEY")),"secure_cookie":COOKIE_SECURE,"database":"SQLite"}
            priority = rows("SELECT * FROM priority_settings WHERE id=1")[0]
            priority["core_regions"] = json.loads(priority["core_regions"] or "[]")
            priority["core_keywords"] = json.loads(priority["core_keywords"] or "[]")
            algorithm=json.loads(rows("SELECT config_json FROM algorithm_config WHERE id=1")[0]["config_json"])
            versions=rows("SELECT id,changed_by,created_at FROM algorithm_config_versions ORDER BY id DESC LIMIT 10") if user["role"]=="admin" else []
            return self.json({"user":user,"csrf":user["csrf"],"questions":questions,"tasks":tasks,"products":products,"claims":claims,"counts":counts,"users":users,"connections":connections,"priority":priority,"algorithm_config":algorithm,"algorithm_versions":versions,"hard_limits":{"trust_coarse_filter":30,"trust_boost_cutoff":40,"match_boost_cutoff":40,"max_total_boost":1.5,"final_score_cap":1000}})
        if path == "/api/export/products.csv":
            user = self.require()
            if not user: return
            out=io.StringIO(); writer=csv.writer(out); writer.writerow(["sku","name","category","material","status"])
            for r in rows("SELECT sku,name,category,material,status FROM products ORDER BY sku"): writer.writerow(r.values())
            body=out.getvalue().encode("utf-8-sig"); self.send_response(200); self.send_header("Content-Type","text/csv; charset=utf-8"); self.send_header("Content-Disposition",'attachment; filename="products.csv"'); self.send_header("Content-Length",str(len(body))); self.end_headers(); return self.wfile.write(body)
        if path in ("/", "/index.html"):
            if not self.user(): self.path="/login.html"
            else: self.path="/index_v3.html"
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        try:
            payload = self.body()
            if path == "/api/auth/login":
                username=str(payload.get("username", ""))[:100]; password=str(payload.get("password", ""))
                with db() as c: row=c.execute("SELECT * FROM users WHERE username=? AND active=1",(username,)).fetchone()
                if not row or not password_ok(password,row["password_hash"]):
                    time.sleep(.35); return self.json({"error":"账号或密码错误"},401)
                token=secrets.token_urlsafe(32); csrf=secrets.token_urlsafe(24); expires=int(time.time())+SESSION_TTL
                with db() as c:
                    c.execute("DELETE FROM sessions WHERE expires_at < ?",(int(time.time()),))
                    c.execute("INSERT INTO sessions VALUES(?,?,?,?,?)",(hashlib.sha256(token.encode()).hexdigest(),row["id"],csrf,expires,now_iso()))
                attrs=f"aigeo_session={sign_token(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_TTL}"
                if COOKIE_SECURE: attrs += "; Secure"
                return self.json({"ok":True}, extra_headers={"Set-Cookie":attrs})
            if path == "/api/auth/logout":
                user=self.require(csrf=True)
                if not user: return
                jar=cookies.SimpleCookie(self.headers.get("Cookie","")); token=verify_token(jar["aigeo_session"].value) if jar.get("aigeo_session") else None
                if token:
                    with db() as c: c.execute("DELETE FROM sessions WHERE token_hash=?",(hashlib.sha256(token.encode()).hexdigest(),))
                return self.json({"ok":True},extra_headers={"Set-Cookie":"aigeo_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"})
            user=self.require(csrf=True)
            if not user: return
            if user["role"] not in ("admin", "operator"):
                return self.json({"error":"只读账号不能修改数据"},403)
            if path == "/api/products":
                sku=str(payload.get("sku","")).strip(); name=str(payload.get("name","")).strip()
                if not sku or not name: raise ValueError("SKU 和商品名称必填")
                now=now_iso()
                with db() as c: c.execute("INSERT INTO products(sku,name,category,material,specifications,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(sku) DO UPDATE SET name=excluded.name,category=excluded.category,material=excluded.material,specifications=excluded.specifications,updated_at=excluded.updated_at",(sku,name,payload.get("category",""),payload.get("material",""),json.dumps(payload.get("specifications",{}),ensure_ascii=False),now,now))
                return self.json({"ok":True},201)
            if path == "/api/users":
                if user["role"] != "admin": return self.json({"error":"仅管理员可以创建账号"},403)
                username=str(payload.get("username","")).strip(); password=str(payload.get("password","")); display=str(payload.get("display_name","")).strip(); role=payload.get("role","viewer")
                if not username or not display or len(password)<10: raise ValueError("账号、姓名必填，初始密码至少 10 位")
                if role not in ("admin","operator","viewer"): raise ValueError("角色无效")
                with db() as c: c.execute("INSERT INTO users(username,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?)",(username,password_hash(password),display,role,now_iso()))
                return self.json({"ok":True},201)
            if path == "/api/questions":
                q=str(payload.get("question","")).strip()
                if not q: raise ValueError("问题不能为空")
                score=max(1,min(100,int(payload.get("opportunity_score",50))))
                with db() as c: cur=c.execute("INSERT INTO questions(question,topic,intent,market,engine,opportunity_score,created_at) VALUES(?,?,?,?,?,?,?)",(q,payload.get("topic",""),payload.get("intent","商品选择"),payload.get("market","cn"),payload.get("engine","豆包"),score,now_iso()))
                return self.json({"ok":True,"id":cur.lastrowid},201)
            if path == "/api/observations":
                qid=int(payload.get("question_id",0)); answer=str(payload.get("answer","")).strip()
                if not qid or not answer: raise ValueError("问题和回答内容必填")
                with db() as c: c.execute("INSERT INTO observations(question_id,engine,answer,brand_status,winner,sources,conditions,collected_at) VALUES(?,?,?,?,?,?,?,?)",(qid,payload.get("engine","人工采集"),answer,payload.get("brand_status","待分析"),payload.get("winner",""),json.dumps(payload.get("sources",[]),ensure_ascii=False),json.dumps(payload.get("conditions",{}),ensure_ascii=False),now_iso()))
                return self.json({"ok":True},201)
            if path == "/api/tasks":
                title=str(payload.get("title","")).strip()
                if not title: raise ValueError("任务标题不能为空")
                now=now_iso()
                with db() as c: cur=c.execute("INSERT INTO tasks(title,source,channel,impact,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",(title,payload.get("source",""),payload.get("channel",""),payload.get("impact",""),payload.get("status","待处理"),now,now))
                return self.json({"ok":True,"id":cur.lastrowid},201)
            if path == "/api/tasks/status":
                with db() as c: c.execute("UPDATE tasks SET status=?,updated_at=? WHERE id=?",(payload.get("status","待处理"),now_iso(),int(payload.get("id",0))))
                return self.json({"ok":True})
            if path == "/api/claims":
                claim=str(payload.get("claim","")).strip()
                if not claim: raise ValueError("声明内容不能为空")
                now=now_iso()
                with db() as c: c.execute("INSERT INTO brand_facts(entity,claim,evidence,status,expires_at,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",(payload.get("entity","园之助"),claim,payload.get("evidence",""),payload.get("status","待验证"),payload.get("expires_at",""),user["id"],now,now))
                return self.json({"ok":True},201)
            if path == "/api/priority/settings":
                multiplier=float(payload.get("company_multiplier",1.8))
                if not 1.0 <= multiplier <= 2.5: raise ValueError("企业调度系数必须在 1.0 到 2.5 之间")
                regions=payload.get("core_regions",[]); keywords=payload.get("core_keywords",[])
                if not isinstance(regions,list) or not isinstance(keywords,list): raise ValueError("地域和关键词必须是数组")
                clean=lambda values:[str(x).strip()[:80] for x in values[:100] if str(x).strip()]
                with db() as c: c.execute("""UPDATE priority_settings SET company_name=?,company_multiplier=?,core_regions=?,core_keywords=?,counter_competitor=?,gap_fill=?,updated_at=? WHERE id=1""",(
                    str(payload.get("company_name","园之助")).strip()[:100] or "园之助", multiplier,
                    json.dumps(clean(regions),ensure_ascii=False),json.dumps(clean(keywords),ensure_ascii=False),
                    1 if payload.get("counter_competitor") else 0,1 if payload.get("gap_fill") else 0,now_iso()))
                return self.json({"ok":True})
            if path == "/api/priority/score":
                payload["_config"]=json.loads(rows("SELECT config_json FROM algorithm_config WHERE id=1")[0]["config_json"])
                return self.json(calculate_priority(payload))
            if path == "/api/rag/simulate":
                if not isinstance(payload.get("chunks"),list): raise ValueError("chunks 必须是数组")
                payload.setdefault("defaults",{})["_config"]=json.loads(rows("SELECT config_json FROM algorithm_config WHERE id=1")[0]["config_json"])
                return self.json(simulate_rag(payload))
            if path == "/api/algorithm/config":
                if user["role"]!="admin": return self.json({"error":"仅算法管理员可以修改参数"},403)
                cfg={
                  "sim_th":clamp(payload.get("sim_th",.45),.4,.6),"top_k_coarse":int(clamp(payload.get("top_k_coarse",100),20,300)),
                  "alpha":clamp(payload.get("alpha",.7),.5,.9),"source_weight":clamp(payload.get("source_weight",.6),.4,.8),
                  "r1_km":clamp(payload.get("r1_km",30),1,500),"r2_km":clamp(payload.get("r2_km",100),1,1000),
                  "competitor_gap_threshold":clamp(payload.get("competitor_gap_threshold",10),5,15),"sparse_source_count":int(clamp(payload.get("sparse_source_count",3),1,10)),
                  "brand_s":clamp(payload.get("brand_s",1.5),0,1.5),"brand_a":clamp(payload.get("brand_a",.8),0,1.5),"brand_b":clamp(payload.get("brand_b",.3),0,1.5)}
                if cfg["r2_km"]<cfg["r1_km"]: raise ValueError("R2 必须大于或等于 R1")
                cfg["content_weight"]=round(1-cfg["source_weight"],4)
                with db() as c:
                    old=c.execute("SELECT config_json FROM algorithm_config WHERE id=1").fetchone()[0]
                    c.execute("INSERT INTO algorithm_config_versions(config_json,changed_by,created_at) VALUES(?,?,?)",(old,user["id"],now_iso()))
                    c.execute("UPDATE algorithm_config SET config_json=?,updated_by=?,updated_at=? WHERE id=1",(json.dumps(cfg),user["id"],now_iso()))
                return self.json({"ok":True,"config":cfg})
            if path == "/api/algorithm/rollback":
                if user["role"]!="admin": return self.json({"error":"仅算法管理员可以回滚参数"},403)
                version=int(payload.get("version_id",0))
                with db() as c:
                    row=c.execute("SELECT config_json FROM algorithm_config_versions WHERE id=?",(version,)).fetchone()
                    if not row: raise ValueError("参数版本不存在")
                    current=c.execute("SELECT config_json FROM algorithm_config WHERE id=1").fetchone()[0]
                    c.execute("INSERT INTO algorithm_config_versions(config_json,changed_by,created_at) VALUES(?,?,?)",(current,user["id"],now_iso()))
                    c.execute("UPDATE algorithm_config SET config_json=?,updated_by=?,updated_at=? WHERE id=1",(row[0],user["id"],now_iso()))
                return self.json({"ok":True})
            if path == "/api/store/import":
                platform=str(payload.get("platform","")).strip(); records=payload.get("records",[])
                if not platform or not isinstance(records,list): raise ValueError("平台和 records 数组必填")
                now=now_iso(); imported=0
                with db() as c:
                    for r in records[:5000]:
                        ext=str(r.get("external_id") or r.get("id") or "").strip(); sku=str(r.get("sku","")).strip()
                        if not ext or not sku: continue
                        c.execute("INSERT INTO store_items(platform,external_id,sku,title,price,stock,url,raw_json,synced_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(platform,external_id) DO UPDATE SET sku=excluded.sku,title=excluded.title,price=excluded.price,stock=excluded.stock,url=excluded.url,raw_json=excluded.raw_json,synced_at=excluded.synced_at",(platform,ext,sku,r.get("title",""),r.get("price"),r.get("stock"),r.get("url",""),json.dumps(r,ensure_ascii=False),now)); imported+=1
                return self.json({"ok":True,"imported":imported})
            if path == "/api/ai/collect":
                qid=int(payload.get("question_id",0)); q=rows("SELECT * FROM questions WHERE id=?",(qid,))
                if not q: raise ValueError("问题不存在")
                key=os.getenv("AIGEO_AI_API_KEY") or os.getenv("OPENAI_API_KEY")
                if not key: return self.json({"error":"服务端尚未配置 AI API Key"},409)
                base=os.getenv("AIGEO_AI_BASE_URL","https://api.openai.com/v1").rstrip("/"); model=os.getenv("AIGEO_AI_MODEL","gpt-5-mini")
                req=urllib.request.Request(base+"/responses",data=json.dumps({"model":model,"input":q[0]["question"]}).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
                with urllib.request.urlopen(req,timeout=90) as response: result=json.loads(response.read().decode())
                text=result.get("output_text","") or "\n".join(c.get("text","") for item in result.get("output",[]) for c in item.get("content",[]) if c.get("type") in ("output_text","text"))
                if not text: raise ValueError("AI 未返回回答")
                with db() as c: c.execute("INSERT INTO observations(question_id,engine,answer,brand_status,winner,sources,conditions,collected_at) VALUES(?,?,?,?,?,?,?,?)",(qid,model,text,"待分析","","[]",json.dumps({"source":"api"}),now_iso()))
                return self.json({"ok":True,"answer":text})
            if path == "/api/scan":
                keywords=payload.get("keywords",[])
                if isinstance(keywords,str): keywords=[x.strip() for x in keywords.replace("，",",").split(",") if x.strip()]
                return self.json({"scan":analyze_url(payload.get("url",""),keywords)})
            return self.json({"error":"接口不存在"},404)
        except (ValueError,json.JSONDecodeError) as exc: return self.json({"error":str(exc)},400)
        except urllib.error.URLError as exc: return self.json({"error":f"外部服务连接失败：{exc.reason}"},502)
        except sqlite3.IntegrityError as exc: return self.json({"error":f"数据冲突：{exc}"},409)
        except Exception as exc: return self.json({"error":f"服务异常：{exc}"},500)


if __name__ == "__main__":
    init_db()
    seed_demo_data()
    host=os.getenv("AIGEO_HOST","127.0.0.1"); port=int(os.getenv("PORT",os.getenv("AIGEO_PORT","8765")))
    url=f"http://{host}:{port}"
    print(f"园之助 GEO Growth OS: {url}")
    if os.getenv("AIGEO_OPEN_BROWSER", "1") == "1" and host in ("127.0.0.1", "localhost"):
        threading.Timer(.8, lambda: webbrowser.open(url)).start()
    try:
        ThreadingHTTPServer((host,port),Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")
