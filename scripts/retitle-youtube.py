#!/usr/bin/env python3
"""
Rename Baker Road sermon videos on YouTube from a plan file.

Reads OAuth client credentials from .env, walks you through consent ONCE,
caches the refresh token, then applies every row in titles.json.

  python3 scripts/retitle-youtube.py --check    # print what would change
  python3 scripts/retitle-youtube.py            # apply

.env needs (from Google Cloud -> Credentials -> your OAuth client):
  YOUTUBE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
  YOUTUBE_OAUTH_CLIENT_SECRET=GOCSPX-...

The OAuth client must list  http://localhost:8080/  as an authorised
redirect URI (Web application type), or be a Desktop app client.
"""
import json, os, sys, webbrowser, urllib.parse, urllib.request, http.server, threading, secrets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, ".env")
TOKEN = os.path.join(ROOT, ".youtube-token.json")
PLAN = os.path.join(ROOT, "scripts", "titles.json")
SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl"
REDIRECT = "http://localhost:8080/"
DRY = "--check" in sys.argv

def env(k):
    if not os.path.exists(ENV): return ""
    for line in open(ENV):
        line = line.strip()
        if line.startswith(k + "="): return line.split("=", 1)[1].strip()
    return ""

CID, CSEC = env("YOUTUBE_OAUTH_CLIENT_ID"), env("YOUTUBE_OAUTH_CLIENT_SECRET")

def post(url, data):
    body = urllib.parse.urlencode(data).encode()
    with urllib.request.urlopen(urllib.request.Request(url, body)) as r:
        return json.load(r)

def consent():
    """Loopback OAuth. Prints a URL; you approve; we catch the code."""
    state, box = secrets.token_urlsafe(16), {}
    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            box.update({k: v[0] for k, v in q.items()})
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
            self.wfile.write(b"<h2>Thank you. You can close this tab and return to the terminal.</h2>")
        def log_message(self, *a): pass
    srv = http.server.HTTPServer(("localhost", 8080), H)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": CID, "redirect_uri": REDIRECT, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state})
    print("\nOpen this and approve access as the account that owns the channel:\n\n" + url + "\n")
    try: webbrowser.open(url)
    except Exception: pass
    while "code" not in box and "error" not in box:
        srv.handle_request()
    if "error" in box: sys.exit("Consent refused: " + box["error"])
    if box.get("state") != state: sys.exit("State mismatch — aborting.")
    tok = post("https://oauth2.googleapis.com/token", {
        "code": box["code"], "client_id": CID, "client_secret": CSEC,
        "redirect_uri": REDIRECT, "grant_type": "authorization_code"})
    json.dump(tok, open(TOKEN, "w"))
    os.chmod(TOKEN, 0o600)
    return tok["access_token"]

def access_token():
    if os.path.exists(TOKEN):
        t = json.load(open(TOKEN))
        if t.get("refresh_token"):
            try:
                return post("https://oauth2.googleapis.com/token", {
                    "refresh_token": t["refresh_token"], "client_id": CID,
                    "client_secret": CSEC, "grant_type": "refresh_token"})["access_token"]
            except Exception as e:
                print("Refresh failed, asking for consent again:", e)
    return consent()

def api(path, tok, params=None, body=None, method="GET"):
    url = "https://www.googleapis.com/youtube/v3/" + path
    if params: url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method,
        headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def main():
    if not os.path.exists(PLAN): sys.exit("Missing " + PLAN)
    plan = json.load(open(PLAN))
    if not DRY and (not CID or not CSEC):
        sys.exit("Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET in .env")
    tok = None if DRY else access_token()
    for row in plan:
        vid, new_title = row["id"], row["title"]
        new_desc = row.get("description", "")
        if DRY:
            print(f"{vid}  ->  {new_title}")
            continue
        cur = api("videos", tok, {"part": "snippet", "id": vid})
        if not cur.get("items"):
            print(f"{vid}  SKIP (not found or not yours)"); continue
        sn = cur["items"][0]["snippet"]
        old = sn.get("title", "")
        sn["title"] = new_title
        if new_desc: sn["description"] = new_desc
        # categoryId is required on update; keep whatever it already had
        try:
            api("videos", tok, {"part": "snippet"}, {"id": vid, "snippet": sn}, "PUT")
            print(f"{vid}  {old[:28]!r} -> {new_title}")
        except urllib.error.HTTPError as e:
            print(f"{vid}  FAILED {e.code}: {e.read().decode()[:200]}")

if __name__ == "__main__":
    main()
