#!/usr/bin/env python3
"""Ainize mark at 512x512, redrawn from ainize-web/public/static/favicon.png (32x32).

Same three rows of rounded capsules, same palette, same alternating short/long rhythm — a memory table
with rows written into it, which is what the product is. Drawn rather than upscaled: the source is 32 px
and any resample of it is mush at 512.
"""
from PIL import Image, ImageDraw

S, SS = 512, 4                      # supersample for clean edges
PURPLE, ORANGE, CYAN = (140, 108, 255), (255, 130, 92), (135, 224, 244)
PAD = 0.085                         # the favicon runs edge to edge; a standalone logo needs air
U = S * (1 - 2 * PAD) / 32.0        # one favicon pixel
OFF = S * PAD

# (y0, y1) and the two capsules on that row, as (x0, x1, colour) in favicon coordinates
ROWS = [
    (1, 7,  [(0, 7, ORANGE), (11, 31, PURPLE)]),
    (13, 19, [(0, 20, CYAN),  (24, 31, PURPLE)]),
    (25, 31, [(0, 7, PURPLE), (11, 31, ORANGE)]),
]

def draw(bg=None):
    im = Image.new('RGBA', (S * SS, S * SS), bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y0, y1, caps in ROWS:
        for x0, x1, col in caps:
            box = [(OFF + x0 * U) * SS, (OFF + y0 * U) * SS, (OFF + (x1 + 1) * U) * SS, (OFF + (y1 + 1) * U) * SS]
            d.rounded_rectangle(box, radius=(box[3] - box[1]) / 2, fill=col + (255,))
    return im.resize((S, S), Image.LANCZOS)

draw().save('media/logo-512.png')                      # transparent, as the favicon is
draw((13, 17, 23, 255)).save('media/logo-512-dark.png')  # on the deck's background
draw((255, 255, 255, 255)).save('media/logo-512-light.png')
print('wrote media/logo-512.png, logo-512-dark.png, logo-512-light.png')
