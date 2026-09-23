#!/usr/bin/env python3
"""Local dev server — runs the portfolio + a faithful emulation of the Netlify Functions.

Stdlib only. Mirrors netlify/lib/auth.js + validate.js behavior:
  same session-token format, same cookie attributes, same CSRF checks,
  same sanitization rules. Published content persists to .dev-portfolio.json.

Usage:
    python3 dev-server.py [port]        # default port 8123

Credentials (env overrides, dev defaults otherwise):
    ADMIN_PASSWORD   default: admin123
    SESSION_SECRET   default: dev-only-secret-change-me
"""
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
STORE_FILE = os.path.join(ROOT, ".dev-portfolio.json")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-secret-change-me")
COOKIE_NAME = "portfolio_admin"
SESSION_TTL = 12 * 60 * 60

attempts = {}  # ip -> [timestamps]


def load_default():
    src = open(os.path.join(ROOT, "js", "config-default.js")).read()
    return json.loads(src.split("=", 1)[1].strip().rstrip(";").strip())


DEFAULT_DATA = load_default()


def load_portfolio():
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE) as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
        except Exception as e:
            print("store read failed:", e)
    return DEFAULT_DATA


def save_portfolio(data):
    with open(STORE_FILE, "w") as f:
        json.dump(data, f)


# ---------- auth (mirror of netlify/lib/auth.js) ----------

def b64e(b):
    return base64.b64encode(b).decode().rstrip("=").replace("+", "-").replace("/", "_")


def b64d(s):
    s = s.replace("-", "+").replace("_", "/")
    return base64.b64decode(s + "=" * (-len(s) % 4))


def sign(payload_b64):
    return b64e(hmac.new(SESSION_SECRET.encode(), payload_b64.encode(), hashlib.sha256).digest())


def create_token():
    payload = json.dumps({"v": 1, "exp": int(time.time()) + SESSION_TTL,
                          "rnd": secrets.token_hex(16)}).encode()
    p = b64e(payload)
    return f"{p}.{sign(p)}"


def verify_token(token):
    try:
        p, sig = str(token).split(".")
        if not hmac.compare_digest(sig, sign(p)):
            return False
        payload = json.loads(b64d(p).decode())
        return isinstance(payload.get("exp"), int) and payload["exp"] >= int(time.time())
    except Exception:
        return False


def is_authenticated(headers):
    cookies = {}
    for part in headers.get("cookie", "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            cookies[k.strip()] = v.strip()
    return verify_token(cookies.get(COOKIE_NAME, ""))


def csrf_check(headers, host):
    origin = headers.get("origin", "")
    referer = headers.get("referer", "")
    custom = headers.get("x-requested-with", "") or headers.get("x-csrf-protect", "")

    def same_host(url):
        try:
            return urlparse(url).netloc == host
        except Exception:
            return False

    if origin:
        return (not host) or same_host(origin)
    if referer:
        return (not host) or same_host(referer)
    return bool(custom)


def rate_limited(ip):
    now = time.time()
    arr = [t for t in attempts.get(ip, []) if now - t < 600]
    arr.append(now)
    attempts[ip] = arr
    return len(arr) > 8


# ---------- validation (mirror of netlify/lib/validate.js) ----------

MAX_RAW = 1_500_000
SECTIONS = ["about", "skills", "projects", "experience", "education", "contact"]
FONTS = ["Inter", "Fraunces", "Space Grotesk", "IBM Plex Sans", "Georgia", "System"]


def clamp(v, mx, fb=""):
    return v[:mx] if isinstance(v, str) else fb


def is_safe_url(v):
    if not isinstance(v, str):
        return False
    s = v.strip()
    if not s or s.startswith("#") or s.startswith("/"):
        return bool(s)
    if re.match(r"^(mailto:|tel:)", s, re.I):
        return len(s) < 300
    if re.match(r"^data:image/(png|jpe?g|webp|gif|svg\+xml);base64,", s, re.I):
        return len(s) < 700_000
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https")
    except Exception:
        return False


def surl(v, fb=""):
    if not isinstance(v, str):
        return fb
    s = v.strip()[:2000]
    return s if (s and is_safe_url(s)) else ("" if not s else fb)


def clean_skill(s):
    if isinstance(s, str):
        s = {"name": s, "level": 70}
    if not isinstance(s, dict):
        return None
    name = clamp(s.get("name", ""), 120)
    if not name.strip():
        return None
    try:
        lvl = round(float(s.get("level", 70)))
    except (TypeError, ValueError):
        lvl = 70
    return {"name": name, "level": max(0, min(100, lvl))}


def clean_project(p):
    if not isinstance(p, dict):
        return None
    title = clamp(p.get("title", ""), 120)
    if not title.strip():
        return None
    tags = p.get("tags", [])
    tags = [t[:40] for t in tags if isinstance(t, str)][:12] if isinstance(tags, list) else []
    return {"id": clamp(p.get("id", ""), 60) or f"p-{int(time.time()*1000)}",
            "title": title, "description": clamp(p.get("description", ""), 2000),
            "tags": tags, "image": surl(p.get("image", "")),
            "url": surl(p.get("url", "")), "repo": surl(p.get("repo", "")),
            "featured": p.get("featured") is True}


def clean_exp(e):
    if not isinstance(e, dict):
        return None
    role, company = clamp(e.get("role", ""), 120), clamp(e.get("company", ""), 120)
    if not role.strip() and not company.strip():
        return None
    return {"id": clamp(e.get("id", ""), 60) or f"e-{int(time.time()*1000)}",
            "role": role, "company": company,
            "period": clamp(e.get("period", ""), 80),
            "location": clamp(e.get("location", ""), 120),
            "summary": clamp(e.get("summary", ""), 2000)}


def clean_edu(e):
    if not isinstance(e, dict):
        return None
    school, degree = clamp(e.get("school", ""), 120), clamp(e.get("degree", ""), 120)
    if not school.strip() and not degree.strip():
        return None
    return {"id": clamp(e.get("id", ""), 60) or f"ed-{int(time.time()*1000)}",
            "school": school, "degree": degree,
            "period": clamp(e.get("period", ""), 80),
            "note": clamp(e.get("note", ""), 2000)}


def is_hex(c):
    return isinstance(c, str) and bool(re.match(r"^#[0-9a-fA-F]{6}$", c))


def num(v, lo, hi, fb):
    try:
        n = float(v)
    except (TypeError, ValueError):
        return fb
    return max(lo, min(hi, n))


def sanitize(d):
    if not isinstance(d, dict):
        raise ValueError("Invalid payload")
    if len(json.dumps(d)) > MAX_RAW:
        raise ValueError("Payload too large")
    g = lambda k: d.get(k) if isinstance(d.get(k), dict) else {}
    site, hero, about, contact, theme = g("site"), g("hero"), g("about"), g("contact"), g("theme")
    socials, layout, footer, nav = g("socials"), g("layout"), g("footer"), g("nav")

    order = [i for i in layout.get("order", []) if i in SECTIONS] if isinstance(layout.get("order"), list) else list(SECTIONS)
    for i in SECTIONS:
        if i not in order:
            order.append(i)
    vis_in = layout.get("visibility", {}) if isinstance(layout.get("visibility"), dict) else {}
    email_re = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    semail = socials.get("email", "")
    semail = semail.strip()[:160] if isinstance(semail, str) and re.match(email_re, semail.strip()) else ""
    cemail = contact.get("email", "")
    cemail = cemail.strip()[:160] if isinstance(cemail, str) and re.match(email_re, cemail.strip()) else ""
    stats = about.get("stats", [])
    stats = [{"value": clamp(str(s.get("value", "")), 30), "label": clamp(str(s.get("label", "")), 60)}
             for s in stats[:4]] if isinstance(stats, list) else []
    links = nav.get("links", [])
    links = [{"label": clamp(l.get("label", ""), 40), "href": surl(l.get("href", ""), "#")}
             for l in links[:8] if isinstance(l, dict) and str(l.get("label", "")).strip()] if isinstance(links, list) else []

    return {
        "version": 1, "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "site": {"title": clamp(site.get("title", ""), 300) or "Portfolio",
                 "description": clamp(site.get("description", ""), 2000),
                 "name": clamp(site.get("name", ""), 120),
                 "role": clamp(site.get("role", ""), 120),
                 "logo": clamp(site.get("logo", ""), 20) or "●"},
        "hero": {"eyebrow": clamp(hero.get("eyebrow", ""), 120),
                 "title": clamp(hero.get("title", ""), 300),
                 "subtitle": clamp(hero.get("subtitle", ""), 2000),
                 "ctaPrimary": clamp(hero.get("ctaPrimary", ""), 60),
                 "ctaPrimaryUrl": surl(hero.get("ctaPrimaryUrl", ""), "#projects"),
                 "ctaSecondary": clamp(hero.get("ctaSecondary", ""), 60),
                 "ctaSecondaryUrl": surl(hero.get("ctaSecondaryUrl", ""), "#contact"),
                 "portrait": surl(hero.get("portrait", ""))},
        "about": {"heading": clamp(about.get("heading", ""), 120) or "About",
                  "body": clamp(about.get("body", ""), 8000),
                  "image": surl(about.get("image", "")),
                  "location": clamp(about.get("location", ""), 120),
                  "availability": clamp(about.get("availability", ""), 120),
                  "stats": stats},
        "skills": [s for s in (clean_skill(x) for x in d.get("skills", [])[:40]) if s] if isinstance(d.get("skills"), list) else [],
        "projects": [p for p in (clean_project(x) for x in d.get("projects", [])[:24]) if p] if isinstance(d.get("projects"), list) else [],
        "experience": [e for e in (clean_exp(x) for x in d.get("experience", [])[:20]) if e] if isinstance(d.get("experience"), list) else [],
        "education": [e for e in (clean_edu(x) for x in d.get("education", [])[:12]) if e] if isinstance(d.get("education"), list) else [],
        "socials": {"github": surl(socials.get("github", "")), "linkedin": surl(socials.get("linkedin", "")),
                    "twitter": surl(socials.get("twitter", "")), "discord": surl(socials.get("discord", "")),
                    "dribbble": surl(socials.get("dribbble", "")),
                    "website": surl(socials.get("website", "")), "email": semail},
        "contact": {"heading": clamp(contact.get("heading", ""), 120) or "Contact",
                    "body": clamp(contact.get("body", ""), 2000),
                    "email": cemail, "buttonLabel": clamp(contact.get("buttonLabel", ""), 60) or "Say hello"},
        "nav": {"links": links},
        "footer": {"text": clamp(footer.get("text", ""), 300), "showSocials": footer.get("showSocials") is not False},
        "layout": {"order": order, "visibility": {i: vis_in.get(i) is not False for i in SECTIONS}},
        "theme": {"appearance": theme.get("appearance") if theme.get("appearance") in ("light", "dark") else "dark",
                  "accent": theme.get("accent") if is_hex(theme.get("accent")) else "#6c7bff",
                  "accent2": theme.get("accent2") if is_hex(theme.get("accent2")) else "#22d3a5",
                  "background": theme.get("background") if is_hex(theme.get("background")) else "#0b0d12",
                  "surface": theme.get("surface") if is_hex(theme.get("surface")) else "#141821",
                  "text": theme.get("text") if is_hex(theme.get("text")) else "#eef1f6",
                  "muted": theme.get("muted") if is_hex(theme.get("muted")) else "#9aa3b2",
                  "headingFont": theme.get("headingFont") if theme.get("headingFont") in FONTS else "Fraunces",
                  "bodyFont": theme.get("bodyFont") if theme.get("bodyFont") in FONTS else "Inter",
                  "radius": num(theme.get("radius"), 0, 28, 14),
                  "spacing": num(theme.get("spacing"), 0, 32, 12),
                  "backgroundEffect": theme.get("backgroundEffect") if theme.get("backgroundEffect") in ("none", "orbs", "grid", "grain") else "orbs"},
    }


# ---------- http ----------

class Handler(BaseHTTPRequestHandler):
    server_version = "DevServer/1.0"

    def log_message(self, fmt, *args):
        print(f"[{self.command} {self.path}]", fmt % args)

    def _headers(self):
        h = {}
        for k, v in self.headers.items():
            h[k.lower()] = v
        return h

    def _send_json(self, code, obj, cookie=None):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self):
        path = urlparse(self.path).path
        if path == "/":
            path = "/index.html"
        if path.startswith("/."):
            self.send_error(404)
            return
        full = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if not full.startswith(ROOT) or not os.path.isfile(full):
            self.send_error(404)
            return
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if full.endswith(".js"):
            ctype = "text/javascript"
        elif full.endswith(".css"):
            ctype = "text/css"
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        fn = path.replace("/.netlify/functions/", "").replace("/api/", "")
        h = self._headers()
        if path.startswith(("/.netlify/functions/", "/api/")):
            if fn == "portfolio-get":
                data = load_portfolio()
                body = json.dumps(data).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif fn == "auth-session":
                self._send_json(200, {"authenticated": is_authenticated(h), "configured": True})
            else:
                self._send_json(404, {"error": "Not found"})
        else:
            self._serve_static()

    def do_POST(self):
        path = urlparse(self.path).path
        fn = path.replace("/.netlify/functions/", "").replace("/api/", "")
        h = self._headers()
        length = int(h.get("content-length", 0) or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw.decode() or "{}")
        except Exception:
            return self._send_json(400, {"error": "Invalid request body"})
        host = h.get("host", "")

        if fn == "auth-login":
            ip = self.client_address[0]
            if rate_limited(ip):
                return self._send_json(429, {"error": "Too many attempts. Try again in a few minutes."})
            pw = body.get("password") if isinstance(body.get("password"), str) else ""
            if not pw or not hmac.compare_digest(pw, ADMIN_PASSWORD):
                time.sleep(0.35)
                return self._send_json(401, {"error": "Incorrect password"})
            token = create_token()
            cookie = f"{COOKIE_NAME}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={SESSION_TTL}"
            return self._send_json(200, {"ok": True}, cookie)

        if fn == "auth-logout":
            if not csrf_check(h, host):
                return self._send_json(403, {"error": "Forbidden"})
            return self._send_json(200, {"ok": True}, f"{COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0")

        if fn == "portfolio-save":
            if not is_authenticated(h):
                return self._send_json(401, {"error": "Not authenticated"})
            if not csrf_check(h, host):
                return self._send_json(403, {"error": "Forbidden (CSRF check failed)"})
            try:
                clean = sanitize(body.get("data", body))
            except ValueError as e:
                return self._send_json(400, {"error": str(e) or "Invalid portfolio data"})
            try:
                save_portfolio(clean)
            except Exception as e:
                print("save failed:", e)
                return self._send_json(500, {"error": "Could not save portfolio"})
            return self._send_json(200, {"ok": True, "updatedAt": clean["updatedAt"], "storage": "local-file"})

        return self._send_json(404, {"error": "Not found"})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"\n  Portfolio dev server at  http://127.0.0.1:{port}/\n"
          f"  Admin password: {ADMIN_PASSWORD}\n"
          f"  (Editor entry: footer © x5, Ctrl+Shift+E, ?edit, or #admin)\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
