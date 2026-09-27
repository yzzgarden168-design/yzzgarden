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
import os
import secrets
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from aigeo_server import analyze_url

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("AIGEO_DATA_DIR", str(ROOT / "runtime_data"))).resolve()
DB_PATH = DATA_DIR / "aigeo.sqlite3"
SESSION_TTL = int(os.getenv("AIGEO_SESSION_TTL", "43200"))
MAX_BODY = 5_000_000
COOKIE_SECURE = os.getenv("AIGEO_COOKIE_SECURE", "0") == "1"
SECRET = os.getenv("AIGEO_SESSION_SECRET", "").encode() or secrets.token_bytes(32)


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
        CREATE INDEX IF NOT EXISTS idx_questions_market ON questions(market, engine);
        CREATE INDEX IF NOT EXISTS idx_observations_question ON observations(question_id, collected_at DESC);
        CREATE INDEX IF NOT EXISTS idx_store_sku ON store_items(sku, platform);
        """)
        if not c.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            username = os.getenv("AIGEO_ADMIN_USER", "admin")
            password = os.getenv("AIGEO_ADMIN_PASSWORD")
            if not password:
                password = secrets.token_urlsafe(12)
                print(f"[首次启动] 管理员账号: {username}  临时密码: {password}")
                print("[重要] 正式上线请设置 AIGEO_ADMIN_PASSWORD 和 AIGEO_SESSION_SECRET")
            c.execute("INSERT INTO users(username,password_hash,display_name,role,created_at) VALUES(?,?,?,?,?)",
                      (username, password_hash(password), "系统管理员", "admin", now_iso()))


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
        super().__init__(*args, directory=str(ROOT), **kwargs)

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
            questions = rows("SELECT q.*,o.answer,o.brand_status,o.winner,o.sources,o.collected_at FROM questions q LEFT JOIN observations o ON o.id=(SELECT id FROM observations WHERE question_id=q.id ORDER BY collected_at DESC LIMIT 1) ORDER BY opportunity_score DESC")
            tasks = rows("SELECT * FROM tasks ORDER BY CASE status WHEN '进行中' THEN 0 WHEN '待处理' THEN 1 ELSE 2 END, id DESC")
            products = rows("SELECT p.*,COUNT(s.id) store_count FROM products p LEFT JOIN store_items s ON s.sku=p.sku GROUP BY p.id ORDER BY p.id DESC")
            claims = rows("SELECT * FROM brand_facts ORDER BY id DESC")
            counts = {"questions":len(questions),"products":len(products),"claims":len(claims),"stores":rows("SELECT COUNT(*) n FROM store_items")[0]["n"]}
            users = rows("SELECT id,username,display_name,role,active,created_at FROM users ORDER BY id") if user["role"]=="admin" else []
            connections={"ai":bool(os.getenv("AIGEO_AI_API_KEY") or os.getenv("OPENAI_API_KEY")),"secure_cookie":COOKIE_SECURE,"database":"SQLite"}
            return self.json({"user":user,"csrf":user["csrf"],"questions":questions,"tasks":tasks,"products":products,"claims":claims,"counts":counts,"users":users,"connections":connections})
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
            if path == "/api/products":
                if user["role"] not in ("admin","operator"): return self.json({"error":"权限不足"},403)
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
                with db() as c: cur=c.execute("INSERT INTO questions(question,topic,intent,market,engine,opportunity_score,created_at) VALUES(?,?,?,?,?,?,?)",(q,payload.get("topic",""),payload.get("intent","商品选择"),payload.get("market","cn"),payload.get("engine","豆包"),int(payload.get("opportunity_score",50)),now_iso()))
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
    host=os.getenv("AIGEO_HOST","127.0.0.1"); port=int(os.getenv("PORT",os.getenv("AIGEO_PORT","8765")))
    print(f"园之助 GEO Growth OS: http://{host}:{port}")
    ThreadingHTTPServer((host,port),Handler).serve_forever()
