#!/usr/bin/env python3
"""
Put YouTube chapters on each full-service upload so the sermon is one click.

YouTube has no "start this video at 33:15" setting. Chapters are the closest
thing: they draw segment markers on the progress bar and list jump links under
the player. Rules YouTube enforces — first chapter at 00:00, at least three,
each at least 10 seconds, ascending order.

Existing description text is kept; the chapter block is appended once and
replaced on later runs.

  python3 scripts/add-chapters.py --check
  python3 scripts/add-chapters.py
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--check" in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith("--")]
MARK = "Chapters:"

def env(k):
    for l in open(os.path.join(ROOT, ".env")):
        if l.startswith(k + "="): return l.split("=", 1)[1].strip()
    return ""

t = json.load(open(os.path.join(ROOT, ".youtube-token.json")))
body = urllib.parse.urlencode({"refresh_token": t["refresh_token"], "client_id": env("YOUTUBE_OAUTH_CLIENT_ID"),
    "client_secret": env("YOUTUBE_OAUTH_CLIENT_SECRET"), "grant_type": "refresh_token"}).encode()
with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", body)) as r:
    TOK = json.load(r)["access_token"]

def api(path, params=None, payload=None, method="GET"):
    url = "https://www.googleapis.com/youtube/v3/" + path
    if params: url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=json.dumps(payload).encode() if payload else None,
        method=method, headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r: return json.load(r)

def stamp(sec):
    h, m, s = int(sec // 3600), int(sec % 3600 // 60), int(sec % 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

times = json.load(open(os.path.join(ROOT, "content", "sermon-times.json")))
ids = ONLY or sorted(times)
done = skipped = 0
for vid in ids:
    w = times.get(vid)
    if not w: print(f"{vid}  no window"); continue
    s, e, d = w["sermonStart"], w["sermonEnd"], w["duration"]
    if s < 70:
        print(f"{vid}  skip: sermon starts too early to mark"); skipped += 1; continue
    cur = api("videos", {"part": "snippet", "id": vid})
    if not cur.get("items"): print(f"{vid}  not found"); continue
    sn = cur["items"][0]["snippet"]
    title = sn.get("title", "")
    short = title.split("|")[0].strip()[:70]
    # YouTube needs three chapters to draw segment markers. Where the sermon
    # runs to the end of the upload there is no third segment, so fall back to
    # a single timestamp line — still clickable, and it does not invent a
    # "Closing" section that is not there.
    if (d - e) >= 30:
        block = (f"{MARK}\n0:00 Welcome and worship\n{stamp(s)} Sermon — {short}\n{stamp(e)} Closing")
    else:
        block = f"{MARK}\nSermon begins at {stamp(s)}"
    base = sn.get("description", "")
    if MARK in base: base = base.split(MARK)[0].rstrip()
    newdesc = (base + "\n\n" + block).strip()
    if newdesc == sn.get("description", ""):
        print(f"{vid}  unchanged"); continue
    if DRY:
        print(f"{vid}  {stamp(s)} sermon  ({short})"); done += 1; continue
    sn["description"] = newdesc
    try:
        api("videos", {"part": "snippet"}, {"id": vid, "snippet": sn}, "PUT")
        print(f"{vid}  chapters set, sermon at {stamp(s)}  {short}"); done += 1
    except urllib.error.HTTPError as ex:
        print(f"{vid}  FAILED {ex.code} {ex.read().decode()[:130]}")
print(f"\n{done} to change, {skipped} skipped")
