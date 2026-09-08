# The leadership portraits: who is in each photo, and how they were built

The source photographs are **not in this repository** — it is public, and the
originals show spouses and members who are not on the website. They are in the
vault alongside it, at `../research/images/`.

## Every identification is confirmed

The numbered filenames are SnapPages asset IDs. The names below come from the
captions in the archived old-site HTML — `research/raw/our-leadership.html` and
`research/raw/crosswalk.html` — not from guesswork about who is who.

The hand-named files were checked too, and they turned out to be the very same
files: `Viola.jpg`, `Layne.jpg`, `Gil .jpg`, `Alan.jpg` and
`Marving and Melinda Staff.jpg` are byte-for-byte identical to the assets the
old site captioned. So there is nothing left to verify by eye.

| File | Person | Role on the old site |
|---|---|---|
| `13204180_1000x1400_2500.jpg` | Marvin Rose | Senior Pastor |
| `7023105_985x1011_2500.jpg` | Sarah Joy McClain | Worship Leader |
| `Alan.jpg` = `14862255` | Harry "Alan" Barber | Deacon / Media & Lighting Tech |
| `10339041_1000x1400_2500.jpg` | Alan Barber | second shot, from Crosswalk |
| `Gil .jpg` = `15082840` | Gilbert "Gil" Johnston, with his wife Vivian | Vice-Chair / Secretary |
| `Layne.jpg` = `14859351` | Layne Ramsey, with his wife Beverly | Deacon |
| `Viola.jpg` = `13838266` | Viola Johnson, with her husband | Child Care Director |
| `Marving and Melinda Staff.jpg` = `14861313` | Melinda Rose, with Marvin | Child Care Coordinator |
| `13838985_1000x1400_2500.jpg` | Steven Arthur | Crosswalk — Planning |
| `13837853_596x802_2500.jpg` | Kathy Pastore | Media Tech |
| `15082893_245x245_2500.jpg` | Margit "Peaches" Williams | Media Tech |
| `14863895_1000x1400_2500.jpg` | Brandon McClain | Audio/Sound Tech |
| `Marvin and Melinda Rose.jpg` | Marvin and Melinda Rose | at a piano, not from the old site |

**There are no solo portraits of the deacons.** The church itself used photos of
a couple as the staff portrait for Viola, Layne, Gil and Melinda. The old-site
storage still serves these files, so that was checked directly rather than
assumed. One asset we never pulled is `15082819` (Daniel Banta, Audio/Sound
Tech), at
`https://storage1.snappages.site/7ZWBBR/assets/images/15082819_245x245_2500.jpg`
— note that host is case-sensitive: the large studio portraits are `.JPG` and
the small 245px ones are `.jpg`.

## What went on the website

Square 440x440 portraits, shown as circles on the About page, in
`brbc-website/public/images/`: `leader-marvin-rose.jpg`,
`leader-sarah-joy-mcclain.jpg`, `leader-viola-johnson.jpg`,
`deacon-alan-barber.jpg`, `deacon-gil-johnston.jpg`, `deacon-layne-ramsey.jpg`.

Each person is cut out of their photograph with rembg and dropped on **#D8DEE9,
the site's own `--border` blue-grey**, then framed to one rule: the head is 52%
of the square with the top of the hair about 17% down. That rule is what makes
six photographs taken years apart read as one set, and the flat ground is what
let the spouses, the studio backdrops and Gil's Valentine's decorations go away
entirely.

The ground was navy first and that was a mistake: the cards are white but most
of these people are in dark clothing, so Viola's jacket and Gil's shirt sank
into the background and both of them looked cut off at the collar. A light grey
from the site's own palette separates every one of them.

Run `python3 scripts/make-portraits.py` to rebuild them; `--install` copies them to the website
and `--bg softer` steps the grey a shade lighter if the discs read too strong
against the white cards.

**Removing a spouse is the fiddly part.** A single straight cut is what made
Viola look like she was standing in a doorway, so each cut is a boundary that
moves down the frame with a feather that widens as it goes: tight across the
face, where the boundary sits on the edge of the hair and there is nothing to
lose, then a little wider across the body, where the spouse overlaps them and
the real shoulder cannot be recovered, so the edge falls away instead of
stopping dead.

Keep those feathers small. On a light ground a broad fade does not read as
shadow, it reads as a bleached streak — a wide one was washing out Viola's left
cheek until it came down to about a tenth of its original width.

Check the frame before adding a cut at all. Layne needed none: his square stops
at source x 574 and Beverly starts around 570, so the boundary was only ever
slicing his own shoulder. Rendering the matte with no cuts is the quickest way
to see whether a cut is earning its place.

One warning, learned twice: measure a face, do not eyeball it. Reading Gil's
position off a screenshot put him 20px off centre in both directions before the
silhouette measurement settled it. The script prints where each head actually
landed for exactly this reason.