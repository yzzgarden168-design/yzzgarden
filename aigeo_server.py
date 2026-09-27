"""园之助 AIGEO 优化与监控服务（仅使用 Python 标准库）。"""
from __future__ import annotations

import json, os, re, socket, threading, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from ipaddress import ip_address
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR, DATA_FILE = ROOT / "runtime_data", ROOT / "runtime_data" / "monitoring.json"
LOCK, MAX_BODY = threading.Lock(), 2_000_000

def now_iso(): return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
def initial_data(): return {"settings":{"brand":"园之助","keywords":["园之助","爬藤架","种植箱","园艺用品"]},"targets":[],"scans":[],"tasks":[],"contents":[]}
def save_data(data):
    DATA_DIR.mkdir(exist_ok=True); tmp=DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8"); tmp.replace(DATA_FILE)
def load_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not DATA_FILE.exists(): save_data(initial_data())
    try:
        data=json.loads(DATA_FILE.read_text(encoding="utf-8")); data.setdefault("contents",[]); return data
    except (OSError,json.JSONDecodeError): return initial_data()

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.title=""; self.description=""; self.canonical=""; self.h1=[]; self.h2=[]; self.jsonld=[]; self.text=[]; self._tag=""; self._buf=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs); self._tag=tag
        if tag in ("title","h1","h2","script"): self._buf=[]
        if tag=="meta" and attrs.get("name","").lower()=="description": self.description=attrs.get("content","").strip()
        if tag=="link" and "canonical" in attrs.get("rel","").lower(): self.canonical=attrs.get("href","")
        if tag=="script" and attrs.get("type","").lower()=="application/ld+json": self._tag="jsonld"; self._buf=[]
    def handle_data(self,data):
        if self._tag in ("title","h1","h2","jsonld"): self._buf.append(data)
        if self._tag not in ("script","style","jsonld") and data.strip(): self.text.append(data.strip())
    def handle_endtag(self,tag):
        value=" ".join(self._buf).strip()
        if tag=="title": self.title=value
        elif tag=="h1" and value: self.h1.append(value)
        elif tag=="h2" and value: self.h2.append(value)
        elif tag=="script" and self._tag=="jsonld" and value: self.jsonld.append(value)
        self._tag=""

def safe_url(raw):
    value=raw.strip()
    if not value.startswith(("http://","https://")): value="https://"+value
    parsed=urllib.parse.urlparse(value)
    if parsed.scheme not in ("http","https") or not parsed.hostname: raise ValueError("请输入有效的 HTTP/HTTPS 地址")
    try:
        for item in socket.getaddrinfo(parsed.hostname,parsed.port or 443):
            ip=ip_address(item[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved: raise ValueError("出于安全原因，不能扫描内网或本机地址")
    except socket.gaierror as exc: raise ValueError("域名无法解析") from exc
    return value

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    """每次跳转都重新验证目标，避免公开地址跳转至内网。"""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, safe_url(newurl))

def analyze_url(raw_url,keywords):
    url=safe_url(raw_url); started=time.perf_counter()
    req=urllib.request.Request(url,headers={"User-Agent":"AIGEO-Monitor/1.0 (+website quality audit)","Accept":"text/html,application/xhtml+xml"})
    try:
        with urllib.request.build_opener(SafeRedirect()).open(req,timeout=15) as response:
            if "html" not in response.headers.get("Content-Type",""): raise ValueError("目标不是 HTML 页面")
            raw=response.read(MAX_BODY+1)
            if len(raw)>MAX_BODY: raise ValueError("页面超过 2MB，已停止扫描")
            html=raw.decode(response.headers.get_content_charset() or "utf-8",errors="replace"); final_url=response.geturl(); status=response.status
    except urllib.error.HTTPError as exc: raise ValueError(f"目标返回 HTTP {exc.code}") from exc
    except urllib.error.URLError as exc: raise ValueError(f"联网失败：{exc.reason}") from exc
    parser=PageParser(); parser.feed(html); text=re.sub(r"\s+"," "," ".join(parser.text)); words=len(re.findall(r"[\u4e00-\u9fff]|[A-Za-z0-9]+",text)); lower=text.lower()
    matched=[k for k in keywords if k and k.lower() in lower]; q_count=len(re.findall(r"[？?]",text)); has_faq=bool(re.search(r"FAQ|常见问题|问答|Q&A",text,re.I)); schema=[]
    for block in parser.jsonld: schema += re.findall(r'"@type"\s*:\s*"([^"]+)"',block)
    checks=[("title",bool(parser.title),10,"补充清晰且包含核心主题的页面标题"),("description",70<=len(parser.description)<=180,10,"将摘要控制在约70–180字并明确价值"),("h1",len(parser.h1)==1,10,"每页保留一个概括主题的 H1"),("content",words>=300,15,"增加可验证、结构化的原创说明"),("questions",has_faq or q_count>=3,15,"加入用户真实问题及直接答案"),("schema",bool(schema),15,"添加 Organization、Product 或 FAQPage 结构化数据"),("canonical",bool(parser.canonical),5,"声明 canonical 规范地址"),("keywords",len(matched)>=min(2,len(keywords)) if keywords else True,10,"自然覆盖品牌、产品和场景实体"),("citations",bool(re.search(r"来源|依据|数据|标准|报告|案例",text)),5,"为数据、结论和案例标注来源与日期"),("freshness",bool(re.search(r"20\d{2}[-年/.]",text)),5,"展示更新日期，建立内容新鲜度信号")]
    score=sum(w for _,ok,w,_ in checks if ok); issues=[{"key":k,"priority":"高" if w>=15 else "中","suggestion":tip} for k,ok,w,tip in checks if not ok]
    return {"id":f"scan_{int(time.time()*1000)}","url":final_url,"requestedUrl":url,"status":status,"scannedAt":now_iso(),"responseMs":round((time.perf_counter()-started)*1000),"score":score,"grade":"优秀" if score>=85 else "良好" if score>=70 else "待改进" if score>=50 else "薄弱","metrics":{"title":parser.title,"descriptionLength":len(parser.description),"h1Count":len(parser.h1),"h2Count":len(parser.h2),"wordCount":words,"schemaTypes":sorted(set(schema)),"matchedKeywords":matched,"questionCount":q_count},"issues":issues}

def build_tasks(scan): return [{"id":f"task_{scan['id']}_{i}","scanId":scan["id"],"url":scan["url"],"title":x["suggestion"],"priority":x["priority"],"status":"待处理","createdAt":now_iso()} for i,x in enumerate(scan["issues"][:6])]
def page_name(scan): return scan.get("metrics",{}).get("title") or urllib.parse.urlparse(scan["url"]).hostname

def fallback_content(p):
    product=p.get("product","园之助爬藤架").strip(); platform=p.get("platform","小红书"); tone=p.get("tone","亲切种草")
    keywords=p.get("keywords",[])
    if isinstance(keywords,str): keywords=[x.strip() for x in re.split(r"[,，\n]",keywords) if x.strip()]
    audience=p.get("audience","阳台园艺爱好者").strip(); benefits=p.get("benefits","免安装、稳固耐用、节省空间").strip(); tags=" ".join("#"+x.replace(" ","") for x in [product,*keywords,"阳台花园","园艺分享"] if x)
    title=f"{product}｜{keywords[0] if keywords else '阳台种植'}新手也能轻松上手🌿"
    body=f"""最近给阳台上的藤本植物安排了一个新家——{product}。

对{audience}来说，最怕的就是工具多、步骤复杂。它的{benefits}设计，让整理枝条和规划生长方向都简单了很多。

我喜欢它的几个理由：

🌱 省心好上手
不需要复杂工具，摆放和调整都很方便。

🌱 释放阳台空间
让植物向上生长，视觉更整洁，小空间也能拥有层次感。

🌱 多种植物都适用
月季、铁线莲、番茄、黄瓜等需要攀爬支撑的植物都可以使用。

选购前建议先量好花盆口径和可用高度，再根据植物长势选择规格。想打造自己的阳台花园，可以从一个省心的支撑架开始。

{tags}"""
    if platform=="抖音": body=f"3秒开场：阳台太小，藤本植物总是长得乱？\n\n镜头1：展示杂乱枝条。\n镜头2：放入{product}，突出{benefits}。\n镜头3：引导枝条向上生长，展示整理前后对比。\n\n口播：不用复杂工具，新手也能快速整理阳台。先量花盆，再选高度，月季、铁线莲和果蔬都能用。\n\n{tags}"
    return {"title":title,"body":body,"mode":"规则生成","platform":platform,"tone":tone,"keywords":keywords}

def ai_content(p):
    key=os.getenv("AIGEO_AI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not key: return fallback_content(p)
    base=os.getenv("AIGEO_AI_BASE_URL","https://api.openai.com/v1").rstrip("/"); model=os.getenv("AIGEO_AI_MODEL","gpt-5-mini")
    prompt=f"""你是园之助品牌的AIGEO内容编辑。请生成一篇可直接发布的中文内容。
平台：{p.get('platform','小红书')}；产品：{p.get('product','园之助爬藤架')}；关键词：{p.get('keywords','')}；卖点：{p.get('benefits','')}；受众：{p.get('audience','')}；语气：{p.get('tone','亲切种草')}。
要求：事实克制，不虚构认证或效果；标题吸引但不夸张；正文结构清楚；自然融入关键词；结尾附相关话题标签。只输出成品正文，首行是标题。"""
    req=urllib.request.Request(base+"/responses",data=json.dumps({"model":model,"input":prompt}).encode(),headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=60) as r: result=json.loads(r.read().decode())
        text=result.get("output_text","")
        if not text:
            text="\n".join(c.get("text","") for item in result.get("output",[]) for c in item.get("content",[]) if c.get("type") in ("output_text","text"))
        if not text.strip(): raise ValueError("AI 未返回内容")
        lines=text.strip().splitlines(); return {"title":lines[0].lstrip("# "),"body":"\n".join(lines[1:]).strip() or text.strip(),"mode":"AI生成","platform":p.get("platform","小红书"),"tone":p.get("tone","亲切种草"),"keywords":p.get("keywords",[])}
    except Exception: return fallback_content(p)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,fmt,*args): print("[AIGEO]",fmt%args)
    def send_json(self,value,code=200):
        body=json.dumps(value,ensure_ascii=False).encode(); self.send_response(code); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(body))); self.send_header("Cache-Control","no-store"); self.end_headers(); self.wfile.write(body)
    def body(self):
        size=int(self.headers.get("Content-Length",0)); return json.loads(self.rfile.read(min(size,200_000)) or b"{}")
    def do_GET(self):
        path=urllib.parse.urlparse(self.path).path
        if path=="/api/state":
            with LOCK: data=load_data()
            return self.send_json(data)
        if path=="/api/health": return self.send_json({"ok":True,"time":now_iso()})
        if path=="/": self.path="/index_v3.html"
        return super().do_GET()
    def do_POST(self):
        try:
            payload=self.body(); path=urllib.parse.urlparse(self.path).path
            if path=="/api/scan":
                with LOCK: data=load_data(); settings=data["settings"]
                keywords=payload.get("keywords") or settings.get("keywords",[])
                if isinstance(keywords,str): keywords=[x.strip() for x in re.split(r"[,，\n]",keywords) if x.strip()]
                scan=analyze_url(payload.get("url",""),keywords)
                with LOCK:
                    data=load_data(); data["scans"].insert(0,scan); data["scans"]=data["scans"][:100]; known=next((t for t in data["targets"] if t["url"]==scan["requestedUrl"]),None)
                    if known: known.update({"lastScan":scan["scannedAt"],"lastScore":scan["score"],"status":"正常"})
                    else: data["targets"].append({"id":f"target_{int(time.time()*1000)}","url":scan["requestedUrl"],"name":page_name(scan),"lastScan":scan["scannedAt"],"lastScore":scan["score"],"status":"正常"})
                    existing={t["title"]+t["url"] for t in data["tasks"] if t["status"]!="已完成"}; data["tasks"] += [t for t in build_tasks(scan) if t["title"]+t["url"] not in existing]; save_data(data)
                return self.send_json({"scan":scan,"state":data})
            if path=="/api/task":
                with LOCK:
                    data=load_data(); task=next((x for x in data["tasks"] if x["id"]==payload.get("id")),None)
                    if not task: return self.send_json({"error":"任务不存在"},404)
                    task["status"]=payload.get("status","已完成"); task["updatedAt"]=now_iso(); save_data(data)
                return self.send_json(data)
            if path=="/api/settings":
                with LOCK: data=load_data(); data["settings"].update({k:v for k,v in payload.items() if k in ("brand","keywords")}); save_data(data)
                return self.send_json(data)
            if path=="/api/content/generate":
                content=ai_content(payload); content.update({"id":f"content_{int(time.time()*1000)}","createdAt":now_iso(),"status":"草稿"})
                with LOCK: data=load_data(); data["contents"].insert(0,content); data["contents"]=data["contents"][:200]; save_data(data)
                return self.send_json({"content":content,"state":data})
            if path=="/api/content/status":
                with LOCK:
                    data=load_data(); content=next((x for x in data["contents"] if x["id"]==payload.get("id")),None)
                    if not content: return self.send_json({"error":"内容不存在"},404)
                    content["status"]=payload.get("status","已发布"); content["updatedAt"]=now_iso(); save_data(data)
                return self.send_json(data)
            return self.send_json({"error":"接口不存在"},404)
        except (ValueError,json.JSONDecodeError) as exc: return self.send_json({"error":str(exc)},400)
        except Exception as exc: return self.send_json({"error":f"服务异常：{exc}"},500)

if __name__=="__main__":
    port=int(os.getenv("AIGEO_PORT","8765")); server=ThreadingHTTPServer(("127.0.0.1",port),Handler); print(f"园之助 AIGEO 系统已启动：http://127.0.0.1:{port}")
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
