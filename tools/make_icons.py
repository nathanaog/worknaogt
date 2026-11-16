#!/usr/bin/env python3
"""
make_icons.py — draws the app icon (a barbell with plate-coloured plates) as PNGs.

Run from the repo folder:  python3 tools/make_icons.py
Needs the Pillow library (pip install pillow). You only need to run this
if you want to change the icon; the PNGs are already in icons/.

Files made:
  icons/icon-192.png, icons/icon-512.png   - for Android / Chrome
  icons/icon-maskable-512.png              - Android "adaptive" icon (extra padding,
                                             because Android may crop it into a circle)
  icons/apple-touch-icon.png (180 px)      - for iPhone home screens
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = "#1B2028"      # gunmetal
CHALK = "#E8EAED"
RED = "#D8343A"     # barbell plate colour in the app
BLUE = "#2F7FD8"    # dumbbell colour in the app


def draw(size, scale=1.0, rounded=True):
    S = 1024  # draw big, then shrink for smooth edges
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S, S], radius=220, fill=BG)
    else:
        d.rectangle([0, 0, S, S], fill=BG)

    c = S / 2
    u = S / 1024 * scale  # unit, so the maskable version can be drawn smaller

    def rect(x0, y0, x1, y1, fill, r):
        d.rounded_rectangle([c + x0 * u, c + y0 * u, c + x1 * u, c + y1 * u], radius=r * u, fill=fill)

    rect(-400, -22, 400, 22, CHALK, 12)       # the bar
    for side in (-1, 1):
        # big red plates, then smaller blue plates outside them, then collars
        x = 150 * side
        rect(min(x, x + 70 * side), -250, max(x, x + 70 * side), 250, RED, 22)
        x2 = 230 * side
        rect(min(x2, x2 + 55 * side), -175, max(x2, x2 + 55 * side), 175, BLUE, 18)
        x3 = 295 * side
        rect(min(x3, x3 + 26 * side), -60, max(x3, x3 + 26 * side), 60, CHALK, 8)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(exist_ok=True)
    draw(192).save(OUT / "icon-192.png")
    draw(512).save(OUT / "icon-512.png")
    draw(512, scale=0.72, rounded=False).save(OUT / "icon-maskable-512.png")
    draw(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")  # iOS rounds corners itself
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
