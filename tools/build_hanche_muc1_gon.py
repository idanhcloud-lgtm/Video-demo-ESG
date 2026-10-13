"""Limitation 01, simplified: 4 bins, 1 nearby pair, 1 message (slides 3, 4, 5 of 'Hạn chế').

Bins (taken from one TO, printed in aisle order A → T):
  1 = aisle C|D near the outbound end, 2 = aisle C|D far end, 3 = aisle D|… near the outbound end (next to 1),
  4 = aisle Q|R far end (where the TO continues). 1 and 3 sit side by side but are not handled back to back.
Slide 3: current order 1 → 2 → 3 → 4 (red: up, down, up again).  Slide 4: algorithm 1 → 3 → 2 → 4 (green).
Slide 5: both together.
Input: original deck with slide 4 duplicated after itself (scripts/add_slide.py deck slide4.xml --after slide4.xml).
Usage: python3 tools/build_hanche_muc1_gon.py <in.pptx> <out.pptx>
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
m.load_carton(prs)

B = {1: m.P[2], 2: m.P[3], 3: m.P[5], 4: m.P[7]}
CUR, OPT = [1, 2, 3, 4], [1, 3, 2, 4]
B1, B2 = m.BAND1, m.BAND2


def path(order):
    pts = []
    for a, b in zip(order, order[1:]):
        seg = m.leg(B[a], B[b])
        pts += seg if not pts else seg[1:]
    return pts


def bins(sc, color, nums=None):
    for n, (x, y) in B.items():
        sc.add_picture(io.BytesIO(m.CARTON), Emu(int(x - 200000)), Emu(int(y - 75000)), Emu(165100), Emu(149622))
        b = m.shape(sc, MSO_SHAPE.OVAL, x + 35000, y - 185000, 190000, 190000, color, 'FFFFFF', 1.0)
        m.text_into(b, [[(str((nums or {}).get(n, n)), 8, 'FFFFFF', True)]], inset=0)


def pair_ring(sc, color):
    (x1, y1), (x2, _) = B[1], B[3]
    x0, x3 = min(x1, x2) - 300000, max(x1, x2) + 300000
    return m.shape(sc, MSO_SHAPE.OVAL, x0, y1 - 330000, x3 - x0, 480000, None, color, 2.0, dash=MSO_LINE.DASH)


def box(sc, x, w, band, lines, color, filled=False):
    s = m.shape(sc, MSO_SHAPE.ROUNDED_RECTANGLE, x, band[0] - 60000, w, band[1] + 120000, color if filled else 'FFFFFF', None if filled else color, 1.5, adj=0.25)
    m.text_into(s, lines)
    return s


def prepare(slide):
    m.clear(slide)
    for sh in list(slide.shapes):
        if sh.name.startswith('Bước'):
            sh._element.getparent().remove(sh._element)


def red_legs(sc, d, w, dash=None):
    """Current order drawn leg by leg, each slightly offset so 'up, down, up again' stays readable."""
    for k, (a, b) in enumerate(zip(CUR, CUR[1:])):
        off = d + (k - 1) * 45000
        m.poly(sc, [(x + off, y) for x, y in m.leg(B[a], B[b])], m.RED, w, dash=dash)


NOTE = [[('Trích 4 điểm trong 1 phiếu TO', 7.5, m.INK, True)], [('in theo thứ tự dãy A → T', 7, m.INK, False)]]

# ---------------- Slide 3: current ----------------
s = prs.slides[2]
prepare(s)
g1 = m.group(s, 'Bước 1 – 4 điểm trên phiếu')
bins(g1.shapes, m.BLUE)
box(g1.shapes, 6280000, 1530000, B1, NOTE, m.BLUE)
g2 = m.group(s, 'Bước 2 – Điểm 1 và 4 sát nhau')
pair_ring(g2.shapes, m.RED)
box(g2.shapes, 8450000, 1550000, B2, [[('Điểm 1 và 3 nằm sát nhau', 7.5, m.RED, True)], [('nhưng không hạ liên tiếp', 7, m.INK, False)]], m.RED)
g3 = m.group(s, 'Bước 3 – Đường đi theo phiếu')
red_legs(g3.shapes, 0, 2.5)
box(g3.shapes, 9860000, 1590000, B1, [[('Hạ 1 → lên hạ 2', 7.5, m.RED, True)], [('→ xuống hạ 3 → lại lên', 7.5, m.RED, True)]], m.RED)
g4 = m.group(s, 'Bước 4 – Kết luận')
box(g4.shapes, 10080000, 1370000, B2, [[('Cùng một khu vực', 7.5, 'FFFFFF', True)], [('xe phải vào 2 lần', 7.5, 'FFFFFF', True)]], m.RED, filled=True)
m.set_timing(s, [[g1], [g2], [g3], [g4]])

# ---------------- Slide 4: algorithm ----------------
s = prs.slides[3]
prepare(s)
g1 = m.group(s, 'Bước 1 – Cùng 4 điểm')
bins(g1.shapes, '8A94A6')
box(g1.shapes, 6280000, 1530000, B1, NOTE, '8A94A6')
g2 = m.group(s, 'Bước 2 – Đường thuật toán')
m.poly(g2.shapes, path(OPT), m.GREEN, 2.5)
bins(g2.shapes, m.GREEN)
box(g2.shapes, 8450000, 2950000, B1, [[('Thứ tự mới: 1 → 3 → 2 → 4, chỉ đi lên một lần', 8, m.GREEN, True)]], m.GREEN)
g3 = m.group(s, 'Bước 3 – Kết luận')
pair_ring(g3.shapes, m.GREEN)
box(g3.shapes, 8450000, 1600000, B2, [[('Điểm 1 và 3 hạ liên tiếp', 7.5, m.GREEN, True)]], m.GREEN)
box(g3.shapes, 10120000, 1330000, B2, [[('Mỗi khu vực', 7.5, 'FFFFFF', True)], [('chỉ vào 1 lần', 7.5, 'FFFFFF', True)]], m.GREEN, filled=True)
m.set_timing(s, [[g1], [g2], [g3]])

# ---------------- Slide 5: both on one map ----------------
s = prs.slides[4]
prepare(s)
for sh in s.shapes:
    if sh.has_text_frame and 'Optimized Route' in sh.text_frame.text:
        runs = [r for p in sh.text_frame.paragraphs for r in p.runs]
        runs[0].text = 'Route Comparison'
        for r in runs[1:]:
            r.text = ''
        if len(runs) > 1:
            runs[1].text = ' / So sánh: theo phiếu A → T và thuật toán'
g1 = m.group(s, 'Bước 1 – 4 điểm + chú giải')
bins(g1.shapes, m.BLUE)
box(g1.shapes, 6280000, 1530000, B1, [[('- - -  ', 8, m.RED, True), ('Theo phiếu: 1 → 2 → 3 → 4', 7, m.INK, True)], [('——  ', 8, m.GREEN, True), ('Thuật toán: 1 → 3 → 2 → 4', 7, m.INK, True)]], '8A94A6')
g2 = m.group(s, 'Bước 2 – Theo phiếu')
red_legs(g2.shapes, -40000, 2.0, MSO_LINE.DASH)
g3 = m.group(s, 'Bước 3 – Thuật toán')
m.poly(g3.shapes, [(x + 40000, y + 40000) for x, y in path(OPT)], m.GREEN, 2.75)
g4 = m.group(s, 'Bước 4 – Kết luận')
pair_ring(g4.shapes, m.NAVY)
box(g4.shapes, 8450000, 1600000, B2, [[('Theo phiếu: 1 và 3 cách nhau', 7, m.RED, True)], [('Thuật toán: 1 và 3 liền nhau', 7, m.GREEN, True)]], m.NAVY)
m.set_timing(s, [[g1], [g2], [g3], [g4]])

prs.save(DST)
print('saved', DST)
