"""One static slide comparing the two routes of limitation 01 on the same map (slide 5 of 'Hạn chế').

Input: the deck after build_hanche_muc1.py with slide 4 duplicated right after itself
(scripts/add_slide.py <deck> slide4.xml --after slide4.xml). The copy is cleared and redrawn:
red dashed = printed order A → T, green solid = algorithm; every bin shows both visit numbers.
Usage: python3 tools/build_hanche_so_sanh.py <in.pptx> <out.pptx>
"""
import io
import sys

from pptx import Presentation
from pptx.enum.dml import MSO_LINE
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from pptx.util import Emu

import build_hanche_muc1 as m

SRC, DST = sys.argv[1], sys.argv[2]
prs = Presentation(SRC)
s = prs.slides[4]
# carton picture: taken from the copied step-1 group before it is cleared
m.CARTON = next(p.image.blob for g in s.shapes if g.name.startswith('Bước 1') for p in g.shapes if p.shape_type == 13)

# clear the copied step groups and animation
for sh in list(s.shapes):
    if sh.name.startswith('Bước'):
        sh._element.getparent().remove(sh._element)
t = s._element.find(qn('p:timing'))
if t is not None:
    s._element.remove(t)

# title
for sh in s.shapes:
    if sh.has_text_frame and 'Optimized Route' in sh.text_frame.text:
        runs = [r for p in sh.text_frame.paragraphs for r in p.runs]
        runs[0].text = 'Route Comparison'
        for r in runs[1:]:
            r.text = ''
        if len(runs) > 1:
            runs[1].text = ' / So sánh lộ trình: A → T và thuật toán'

OPT_POS = {n: m.OPT.index(n) + 1 for n in m.P}
OFF = 35000  # the two routes run side by side, offset in opposite directions


def shift(pts, d):
    return [(x + d, y + d) for x, y in pts]


def full(order):
    pts = m.door_out(m.P[order[0]])
    for a, b in zip(order, order[1:]):
        pts += m.leg(m.P[a], m.P[b])[1:]
    return pts + m.door_back(m.P[order[-1]], 70000)[1:]


def badge(sc, x, y, n, color):
    b = m.shape(sc, MSO_SHAPE.OVAL, x, y, 165000, 165000, color, 'FFFFFF', 1.0)
    m.text_into(b, [[(str(n), 7, 'FFFFFF', True)]], inset=0)


# Step 1: bins with the printed order (red) + legend
g1 = m.group(s, 'Bước 1 – 9 thùng + chú giải')
for n, (x, y) in m.P.items():
    g1.shapes.add_picture(io.BytesIO(m.CARTON), Emu(int(x - 200000)), Emu(int(y - 75000)), Emu(165100), Emu(149622))
    badge(g1.shapes, x - 230000, y - 250000, n, m.RED)
leg_box = m.shape(g1.shapes, MSO_SHAPE.ROUNDED_RECTANGLE, 10340000, m.BAND1[0] - 60000, 1110000, m.BAND1[1] + 120000, 'FFFFFF', '8A94A6', 1.0, adj=0.2)
m.text_into(leg_box, [[('- - -  ', 8, m.RED, True), ('Theo phiếu A → T', 7, m.INK, True)], [('——  ', 8, m.GREEN, True), ('Thuật toán', 7, m.INK, True)]], align=m.PP_ALIGN.LEFT)

# Step 2: printed order route
g2 = m.group(s, 'Bước 2 – Đường A → T')
m.poly(g2.shapes, shift(full(m.CUR), -OFF), m.RED, 1.75, dash=MSO_LINE.DASH)

# Step 3: algorithm route + its visit numbers
g3 = m.group(s, 'Bước 3 – Đường thuật toán')
m.poly(g3.shapes, shift(full(m.OPT), OFF), m.GREEN, 2.5)
for n, (x, y) in m.P.items():
    badge(g3.shapes, x + 40000, y - 250000, OPT_POS[n], m.GREEN)

# Step 4: the two nearby pairs and the result
g4 = m.group(s, 'Bước 4 – Cặp điểm gần nhau + kết quả')
# rings sit under the bins and badges (own group, moved before step 1, shown together with step 4)
rings = m.group(s, 'Bước 4 – Khoanh cặp điểm')
for a, b in ((2, 5), (6, 9)):
    (x1, y1), (x2, _) = m.P[a], m.P[b]
    x0, x3 = min(x1, x2) - 330000, max(x1, x2) + 300000
    m.shape(rings.shapes, MSO_SHAPE.OVAL, x0, y1 - 360000, x3 - x0, 520000, None, m.NAVY, 1.75, dash=MSO_LINE.DASH)
g1._element.addprevious(rings._element)
m.label(g4.shapes, 8420000, m.BAND2[0] - 80000, 1330000, m.BAND2[1] + 160000,
        [[('Cặp 2 · 5', 7, m.NAVY, True)], [('A → T: điểm thứ 2 và 5', 6.5, m.RED, True)], [('Thuật toán: thứ 8 và 9', 6.5, m.GREEN, True)]], m.NAVY)
m.label(g4.shapes, 10340000, m.BAND2[0] - 80000, 1110000, m.BAND2[1] + 160000,
        [[('Cặp 6 · 9', 7, m.NAVY, True)], [('A → T: thứ 6 và 9', 6.5, m.RED, True)], [('Thuật toán: thứ 6 và 7', 6.5, m.GREEN, True)]], m.NAVY)
res = m.shape(g4.shapes, MSO_SHAPE.ROUNDED_RECTANGLE, 8420000, m.BAND1[0] - 60000, 1330000, m.BAND1[1] + 120000, m.GREEN, None, adj=0.2)
m.text_into(res, [[('Thuật toán ngắn hơn', 7.5, 'FFFFFF', True)], [(f'khoảng {m.SAVE}% quãng đường', 7.5, 'FFFFFF', True)]])

m.set_timing(s, [[g1], [g2], [g3], [rings, g4]])
prs.save(DST)
print('saved', DST)
