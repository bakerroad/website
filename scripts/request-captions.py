#!/usr/bin/env python3
"""
Ask YouTube to generate auto-captions for videos that have none.

YouTube only runs speech recognition when it knows what language the audio is
in. These older uploads never had that set, which is why they have no
transcript. Setting defaultAudioLanguage is the documented trigger.

  python3 scripts/request-captions.py --check
  python3 scripts/request-captions.py
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--check" in sys.argv
IDS = [a for a in sys.argv[1:] if not a.startswith("--")]

def env(k):
    for line in open(os.path.join(ROOT, ".env")):
        if line.startswith(k + "="): return line.split("=", 1)[1].strip()
    return ""

def token():
    t = json.load(open(os.path.join(ROOT, ".youtube-token.json")))
    body = urllib.parse.urlencode({
        "refresh_token": t["refresh_token"], "client_id": env("YOUTUBE_OAUTH_CLIENT_ID"),
        "client_secret": env("YOUTUBE_OAUTH_CLIENT_SECRET"), "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", body)) as r:
        return json.load(r)["access_token"]

def api(path, tok, params=None, body=None, method="GET"):
    url = "https://www.googleapis.com/youtube/v3/" + path
    if params: url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
        method=method, headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

tok = token()
for vid in IDS:
    cur = api("videos", tok, {"part": "snippet", "id": vid})
    if not cur.get("items"):
        print(f"{vid}  SKIP not found"); continue
    sn = cur["items"][0]["snippet"]
    have = sn.get("defaultAudioLanguage")
    if have == "en":
        print(f"{vid}  already set  ({sn['title'][:40]})"); continue
    if DRY:
        print(f"{vid}  would set en  (was {have or 'unset'})  {sn['title'][:40]}"); continue
    sn["defaultAudioLanguage"] = "en"
    sn.setdefault("defaultLanguage", "en")
    try:
        api("videos", tok, {"part": "snippet"}, {"id": vid, "snippet": sn}, "PUT")
        print(f"{vid}  set en  {sn['title'][:40]}")
    except urllib.error.HTTPError as e:
        print(f"{vid}  FAILED {e.code}: {e.read().decode()[:160]}")
