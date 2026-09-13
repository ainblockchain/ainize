#!/usr/bin/env python3
"""16:9 brand cover — many people teaching one base model.

Left: scattered capsules, one per contributor, in the brand colours. They converge to the right, where
they land as the rows of the mark: one memory table, written by many hands. That is the product in a
picture — the model is not finished when it arrives, it is grown by whoever uses it.
"""
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W,H,SS = 1920,1080,2
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=lambda p,s: ImageFont.truetype(p,int(s*SS))
S=lambda v: int(v*SS)
BG=(13,17,23); FG=(240,246,252); MUT=(139,152,165)
PURPLE,ORANGE,CYAN=(140,108,255),(255,130,92),(135,224,244)
COLS=[PURPLE,ORANGE,CYAN]

im=Image.new('RGB',(W*SS,H*SS),BG); d=ImageDraw.Draw(im)

# wash
glow=Image.new('RGB',(W*SS,H*SS),BG); g=ImageDraw.Draw(glow)
for cx,cy,r,c in [(1330,470,430,PURPLE),(380,380,300,ORANGE),(520,700,280,CYAN)]:
    g.ellipse([S(cx-r),S(cy-r),S(cx+r),S(cy+r)],fill=c)
im=Image.blend(im,glow.filter(ImageFilter.GaussianBlur(S(160))),0.15); d=ImageDraw.Draw(im)

# ── left: many contributors, each a small capsule
random.seed(7)
MX,MY=S(1150),S(470)                       # where the table sits
for i in range(46):
    col=COLS[i%3]
    x=random.uniform(110,780); y=random.uniform(180,780)
    w=random.uniform(38,120); h=26
    t=(x-110)/670                           # closer to the table = more solid
    a=int(60+150*t)
    lay=Image.new('RGBA',(W*SS,H*SS),(0,0,0,0)); ld=ImageDraw.Draw(lay)
    ld.rounded_rectangle([S(x),S(y),S(x+w),S(y+h)],radius=S(h/2),fill=col+(a,))
    im=Image.alpha_composite(im.convert('RGBA'),lay).convert('RGB')
d=ImageDraw.Draw(im)

# ── right: the mark — one table, the rows assembled
SPAN=S(430); OX,OY=S(1130),S(255); U=SPAN/32.0
ROWS=[(1,7,[(0,7,ORANGE),(11,31,PURPLE)]),(13,19,[(0,20,CYAN),(24,31,PURPLE)]),(25,31,[(0,7,PURPLE),(11,31,ORANGE)])]
for y0,y1,caps in ROWS:
    for x0,x1,col in caps:
        b=[OX+x0*U,OY+y0*U,OX+(x1+1)*U,OY+(y1+1)*U]
        d.rounded_rectangle(b,radius=(b[3]-b[1])/2,fill=col)

d.text((S(1130),S(700)),"Ainize",font=f(FB,96),fill=FG)

# ── the line, centred and measured so it cannot run off
line="One base model. Its memory taught by many people, in pieces, in the open."
fo=f(F,40); tw=d.textlength(line,font=fo)
d.text(((W*SS-tw)/2,S(900)),line,font=fo,fill=MUT)
sub="github.com/ainblockchain/ainize"
fs=f(F,28); sw=d.textlength(sub,font=fs)
d.text(((W*SS-sw)/2,S(965)),sub,font=fs,fill=PURPLE)

out=im.resize((W,H),Image.LANCZOS)
out.save('media/cover-1920x1080.png'); out.resize((640,360),Image.LANCZOS).save('media/cover-640x360.png')
print('ok')
