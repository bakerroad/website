#!/usr/bin/env python3
"""Set a video's privacyStatus. Used to take non-sermons off the website:
the sync only publishes public videos, so unlisting removes the page while
leaving the recording reachable by link for anyone who wants it."""
import json,os,sys,urllib.request,urllib.parse,urllib.error
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY="--check" in sys.argv
STATUS=next((a.split("=")[1] for a in sys.argv if a.startswith("--status=")),"unlisted")
IDS=[a for a in sys.argv[1:] if not a.startswith("--")]
def env(k):
    for l in open(os.path.join(ROOT,".env")):
        if l.startswith(k+"="): return l.split("=",1)[1].strip()
    return ""
t=json.load(open(os.path.join(ROOT,".youtube-token.json")))
body=urllib.parse.urlencode({"refresh_token":t["refresh_token"],"client_id":env("YOUTUBE_OAUTH_CLIENT_ID"),
  "client_secret":env("YOUTUBE_OAUTH_CLIENT_SECRET"),"grant_type":"refresh_token"}).encode()
with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token",body)) as r:
    tok=json.load(r)["access_token"]
def api(path,params=None,payload=None,method="GET"):
    url="https://www.googleapis.com/youtube/v3/"+path
    if params: url+="?"+urllib.parse.urlencode(params)
    req=urllib.request.Request(url,data=json.dumps(payload).encode() if payload else None,method=method,
        headers={"Authorization":"Bearer "+tok,"Content-Type":"application/json"})
    with urllib.request.urlopen(req) as r: return json.load(r)
for vid in IDS:
    cur=api("videos",{"part":"snippet,status","id":vid})
    if not cur.get("items"): print(f"{vid}  not found"); continue
    it=cur["items"][0]; was=it["status"]["privacyStatus"]; title=it["snippet"]["title"][:44]
    if was==STATUS: print(f"{vid}  already {STATUS}  {title}"); continue
    if DRY: print(f"{vid}  {was} -> {STATUS}  {title}"); continue
    st=it["status"]; st["privacyStatus"]=STATUS
    try:
        api("videos",{"part":"status"},{"id":vid,"status":st},"PUT")
        print(f"{vid}  {was} -> {STATUS}  {title}")
    except urllib.error.HTTPError as e:
        print(f"{vid}  FAILED {e.code} {e.read().decode()[:140]}")
