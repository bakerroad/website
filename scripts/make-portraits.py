#!/usr/bin/env python3
"""Build the round About-page portraits for brbcbaytown.org.

    python3 scripts/make-portraits.py            # writes ./portraits/
    python3 scripts/make-portraits.py --install  # also copies them into public/images
    python3 scripts/make-portraits.py --bg softer   # a lighter ground

The source photographs are not in this repository — see SOURCES below, and
docs/LEADERSHIP-PHOTOS.md for what each one is and who is in it. Pass --src if
they are somewhere else. The six built portraits ARE committed, so the site
never depends on this script having been run.

Every photo the church gave us is either a studio portrait or a snapshot, and
four of the six are photos of a couple. So each person is cut out with rembg,
dropped on a flat ground taken from the site's palette, and framed to one rule:
the head is 52% of the square and the top of the hair sits about 17% down. That
single rule is what makes six photographs taken years apart read as one set.

Needs: pip install rembg onnxruntime pillow scipy numpy
The u2net_human_seg model downloads once to ~/.u2net (about 176 MB).

To add someone — Melinda Rose, Brandon McClain, Daniel Banta, Kathy Pastore and
Peaches Williams all have photos on the old site, see docs/LEADERSHIP-PHOTOS.md
for their asset IDs — add a row to PEOPLE giving the top of their hair, the bottom of
their chin and the centre of their face in source pixels. Then run it and check
the head top / head cx it prints land near 17% and 50%; nudge `cx` by the
difference if they do not. Measure, do not eyeball: a face read off a screenshot
put Gil 20px off centre twice.
"""
import argparse, os, shutil

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, "..", "public", "images"))
# The source photographs are NOT in this repository. It is public, and the
# originals show spouses and members who are not on the website — four of the
# six are photographs of a couple. They live in the vault beside it:
SOURCES = os.path.normpath(os.path.join(HERE, "..", "..", "research", "images"))

# top   — top of the hair, in source pixels
# chin  — bottom of the chin, or of the beard
# cx    — horizontal centre of the face (not of the hair, which can be lopsided)
# cuts  — how the spouse standing beside them is taken away. Each cut is
#         dict(side="left"|"right", x=[(y, x), ...], f=[(y, feather), ...]).
#         `x` is the boundary, given as a few points down the frame and
#         interpolated between; `f` is how far the person's own edge fades
#         before it. Both vary with height, and they have to:
#
#           - Across the FACE the boundary sits right on the edge of the hair,
#             where there is nothing of theirs to lose, so the feather is tiny.
#           - Across the BODY the spouse overlaps them and the real shoulder
#             cannot be recovered, so the feather widens a little and the edge
#             falls away rather than stopping dead.
#
#         Keep the feathers small. They are wide enough to break up a straight
#         line and no wider: on a light ground a broad fade does not read as
#         shadow, it reads as a bleached streak, and at one point it was washing
#         out Viola's left cheek. A single straight cut, on the other hand, is
#         what made her look like she was standing in a doorway — a hard
#         vertical edge on both sides, top to bottom.
# erase — rectangles (x0, y0, x1, y1) of leftover backdrop that no cut catches.
#         None means "to the edge of the frame".
PEOPLE = [
    dict(src="13204180_1000x1400_2500.jpg", out="leader-marvin-rose.jpg",
         top=105, chin=540, cx=508),
    dict(src="7023105_985x1011_2500.jpg", out="leader-sarah-joy-mcclain.jpg",
         top=190, chin=470, cx=560),
    # Viola's husband stands on her left and has an arm round her right
    # shoulder, so she is overlapped on both sides below the chin.
    dict(src="Viola.jpg", out="leader-viola-johnson.jpg",
         top=450, chin=760, cx=741,
         cuts=[dict(side="right", x=[(0, 596), (1400, 596)],
                    f=[(0, 6), (500, 6), (700, 12), (900, 19), (1400, 21)]),
               dict(side="left", x=[(0, 888), (740, 888), (900, 945), (1400, 985)],
                    f=[(0, 6), (500, 6), (700, 12), (900, 19), (1400, 21)])]),
    dict(src="Alan.jpg", out="deacon-alan-barber.jpg",
         top=370, chin=650, cx=510),
    # Vivian is at Gil's left shoulder; her red sleeve needs the boundary to
    # step in below his collar.
    dict(src="Gil .jpg", out="deacon-gil-johnston.jpg",
         top=11, chin=132, cx=55,
         cuts=[dict(side="left", x=[(0, 150), (150, 150), (185, 118), (245, 112)],
                    f=[(0, 3), (85, 4), (140, 17), (245, 22)])]),
    # No cut: the frame stops at source x 574 and Beverly starts at about 570,
    # so a boundary here only ever sliced his own shoulder.
    dict(src="Layne.jpg", out="deacon-layne-ramsey.jpg",
         top=284, chin=677, cx=196),
]

HEAD_FRAC = 0.52   # head height as a share of the square. Smaller = more room.
HEAD_CY = 0.44     # where the centre of the head sits, top to bottom
SIZE = 440         # the page shows this at 112px, inside a circle

# A light ground, because the cards are white and most of these people are in
# dark clothing. On the navy this page used first, Viola's jacket and Gil's
# shirt sank into the background and both of them looked cut off at the collar.
GROUNDS = {
    "gray": (216, 222, 233),   # --border, the site's own blue-grey
    "softer": (228, 233, 241),  # a step lighter, if the disc reads too strong
    "alt": (240, 243, 248),    # --surface-alt, almost invisible on a white card
    "navy": (23, 33, 58),      # --surface-deep. Sinks dark clothing; see above.
    "brand": (34, 78, 155),    # --brand
}


def matte(path):
    """Cut the people out of a photograph. Returns RGBA."""
    from rembg import remove, new_session
    global _SESSION
    try:
        _SESSION
    except NameError:
        _SESSION = new_session("u2net_human_seg")
    return remove(Image.open(path).convert("RGB"), session=_SESSION)


def portrait(person, ground, sources=SOURCES):
    cut = matte(os.path.join(sources, person["src"]))
    W, H = cut.size
    scale = W / 1000
    alpha = np.asarray(cut)[:, :, 3].astype(float).copy()

    for x0, y0, x1, y1 in person.get("erase", []):
        alpha[y0 or 0: y1 or H, x0 or 0: x1 or W] = 0

    # Pull the matte in a hair, so no fringe of the old background survives,
    # then soften it so the edge does not read as a cut-out.
    solid = ndimage.binary_erosion(alpha > 128, iterations=max(1, round(1.5 * scale)))
    alpha = ndimage.gaussian_filter(solid * 255.0, max(0.6, 1.2 * scale))

    rows, cols = np.arange(H), np.arange(W)
    for spec in person.get("cuts", []):
        ys, xs = zip(*spec["x"])
        boundary = np.interp(rows, ys, xs)[:, None]
        ys, fs = zip(*spec["f"])
        feather = np.maximum(np.interp(rows, ys, fs), 1)[:, None]
        inside = (cols[None, :] - boundary) if spec["side"] == "right" else (boundary - cols[None, :])
        alpha *= np.clip(inside / feather, 0, 1)

    cut.putalpha(Image.fromarray(alpha.clip(0, 255).astype(np.uint8)))

    head = person["chin"] - person["top"]
    side = round(head / HEAD_FRAC)
    left = round(person["cx"] - side / 2)
    upper = round((person["top"] + person["chin"]) / 2 - side * HEAD_CY)

    # The ground is solid, so a square reaching past the edge of the original
    # photograph just fills in — no mirroring, no black wedge.
    frame = Image.new("RGB", (side, side), ground)
    frame.paste(cut, (-left, -upper), cut)
    return frame.resize((SIZE, SIZE), Image.LANCZOS), side


def report(img):
    """Where the head actually landed, as a share of the frame. This is the
    check that matters: all six should agree, or they will not look like a set."""
    a = np.asarray(img.convert("RGB")).astype(int)
    ground = a[0, 0]
    person = (np.abs(a - ground).sum(2) > 40)
    rows = np.nonzero(person.any(1))[0]
    if not len(rows):
        return None, None
    top = rows.min()
    band = person[top: top + int((rows.max() - top) * 0.45)]
    xs = np.nonzero(band.any(0))[0]
    return top / SIZE * 100, (xs.min() + xs.max()) / 2 / SIZE * 100


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bg", default="gray", choices=sorted(GROUNDS))
    ap.add_argument("--out", default=os.path.join(HERE, "..", "portraits"))
    ap.add_argument("--src", default=SOURCES,
                    help="where the original photographs live (default: %(default)s)")
    ap.add_argument("--install", action="store_true",
                    help=f"copy the results into {SITE}")
    args = ap.parse_args()

    if not os.path.isdir(args.src):
        raise SystemExit(f"source photographs not found at {args.src}\n"
                         "They are deliberately not in this repository; pass --src.")
    os.makedirs(args.out, exist_ok=True)
    for person in PEOPLE:
        img, side = portrait(person, GROUNDS[args.bg], args.src)
        path = os.path.join(args.out, person["out"])
        img.save(path, "JPEG", quality=90, optimize=True, progressive=True)
        top, cx = report(img)
        print(f"{person['out']:34s} crop {side:4d}px  {SIZE/side:4.2f}x   "
              f"head top {top:4.1f}% (want ~17)   head cx {cx:4.1f}% (want ~50)")
        if args.install:
            shutil.copy2(path, os.path.join(SITE, person["out"]))

    if args.install:
        print(f"\ninstalled to {SITE}")


if __name__ == "__main__":
    main()
