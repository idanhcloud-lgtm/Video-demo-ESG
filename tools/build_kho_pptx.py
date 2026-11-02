"""Warehouse-network deck with Morph transitions: the map of Vietnam is one set of named vector shapes that every
slide places at its own zoom, so PowerPoint's Morph flies from the whole country into each warehouse.

Usage: python3 tools/build_kho_pptx.py <kho.json> <public dir> <out.pptx>
kho.json: {"kho": [...], "places": [...]} in the shape of src/data/khoDT.ts (kept out of git).
Map shapes come from src/data/vnMap.json (tools/build_vn_map.py).
"""
import json
import math
import os
import sys

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

kho_path, public_dir, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
DATA = json.load(open(kho_path, encoding='utf-8'))
KHO, PLACES = DATA['kho'], DATA['places']
MAP = json.load(open('src/data/vnMap.json', encoding='utf-8'))

FONT = 'Arial'
INK = RGBColor(0x14, 0x28, 0x6B)
SUB = RGBColor(0x5A, 0x67, 0x88)
GREEN = RGBColor(0x0F, 0x9D, 0x63)
BLUE = RGBColor(0x1F, 0x6F, 0xE5)
LINE_BLUE = RGBColor(0x1F, 0x5F, 0xC8)
AMBER = RGBColor(0xD9, 0x94, 0x00)
AMBER_TEXT = RGBColor(0xB0, 0x78, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
TILE = RGBColor(0xF1, 0xF5, 0xFB)
BORDER = RGBColor(0xD9, 0xE2, 0xF2)
SEA = RGBColor(0xCF, 0xE0, 0xF4)
NEIGH = RGBColor(0xDD, 0xE2, 0xEA)
NEIGH_LINE = RGBColor(0xB9, 0xC3, 0xD3)

SW, SH = 13.333, 7.5
K = 0.42  # inches per degree at zoom 1
COSL = math.cos(math.radians(16))


def wx(lon):
    return (lon - 109.5) * K * COSL


def wy(lat):
    return -(lat - 15.4) * K


def nf(n):
    return f'{round(n):,}'.replace(',', '.')


def ring_area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2


VN_RINGS = [r for r in MAP['vn'] if ring_area(r) > 0.0005]
NB_RINGS = [r for r in MAP['neighbours'] if ring_area(r) > 0.02]
ISLANDS = MAP['hoangSa'] + MAP['truongSa']

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(SW), Inches(SH)
BLANK = prs.slide_layouts[6]

NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
MORPH = (
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    f'xmlns:p="{NS_P}" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">'
    '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
    '<p:transition spd="slow" p14:dur="1800"><p159:morph option="byObject"/></p:transition></mc:Choice>'
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
)


def add_morph(slide):
    el = etree.fromstring(MORPH)
    root = slide._element
    clr = root.find(f'{{{NS_P}}}clrMapOvr')
    (clr.addnext(el) if clr is not None else root.find(f'{{{NS_P}}}cSld').addnext(el))


def new_slide(bg=SEA):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = bg
    return s


def text(slide, x, y, w, h, runs, size=14, color=INK, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, name=None):
    """runs: str, or list of paragraphs; each paragraph a list of (text, {size,color,bold}) runs."""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    paras = [[(runs, {})]] if isinstance(runs, str) else runs
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        for t, st in para:
            r = p.add_run()
            r.text = t
            f = r.font
            f.name = FONT
            f.size = Pt(st.get('size', size))
            f.bold = st.get('bold', bold)
            f.color.rgb = st.get('color', color)
    return tb


def box(slide, x, y, w, h, fill, line=None, radius=0.12, name=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE, line_w=1.0, shadow=False):
    sh = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        sh.name = name
    sh.fill.solid()
    sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(line_w)
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        sh.adjustments[0] = min(0.5, radius / min(w, h))
    if not shadow:
        sh.shadow.inherit = False
    sh.text_frame.text = ''
    return sh


def draw_map(slide, cam):
    """cam: (lon, lat, z, sx, sy) — screen centre (inches) where (lon, lat) lands, at zoom z."""
    lon0, lat0, z, sx, sy = cam

    def scr(lo, la):
        return sx + (wx(lo) - wx(lon0)) * z, sy + (wy(la) - wy(lat0)) * z

    def poly(r, name, fill, line, lw):
        pts = [scr(lo, la) for lo, la in r]
        b = slide.shapes.build_freeform(Inches(pts[0][0]), Inches(pts[0][1]))
        b.add_line_segments([(Inches(x), Inches(y)) for x, y in pts[1:]], close=True)
        sh = b.convert_to_shape()
        sh.name = name
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
        sh.line.color.rgb = line
        sh.line.width = Pt(lw)
        sh.shadow.inherit = False
        return sh

    for i, r in enumerate(NB_RINGS):
        poly(r, f'!!nb{i}', NEIGH, NEIGH_LINE, 0.5)
    for i, r in enumerate(VN_RINGS):
        poly(r, f'!!vn{i}', WHITE, LINE_BLUE, 1.25)
    for i, (lo, la) in enumerate(ISLANDS):
        x, y = scr(lo, la)
        d = 0.05
        box(slide, x - d / 2, y - d / 2, d, d, LINE_BLUE, name=f'!!is{i}', shape=MSO_SHAPE.OVAL)
    return scr


def pins(slide, scr, active=None, labels=True, label_size=11):
    for k in KHO:
        x, y = scr(k['lon'], k['lat'])
        on = k['id'] == active
        col = GREEN if k.get('hub') else AMBER if k.get('estimated') else BLUE
        d = 0.26 if k.get('hub') else 0.2
        if on:
            box(slide, x - d * 1.3, y - d * 1.3, d * 2.6, d * 2.6, WHITE, line=col, name='!!ring', shape=MSO_SHAPE.OVAL, line_w=2.5)
        p = box(slide, x - d / 2, y - d / 2, d, d, col, line=WHITE, name=f'!!pin_{k["id"]}', shape=MSO_SHAPE.OVAL, line_w=2)
        if labels:
            name = k['vi'].split(' (')[0]
            # a warehouse just south-west of another gets its name on the left, so the two never overlap
            left = any(o is not k and 0 < o['lon'] - k['lon'] < 0.1 and 0 < o['lat'] - k['lat'] < 0.1 for o in KHO)
            run = [[(name, {'bold': on, 'size': label_size + (2 if on else 0)})]]
            gap = d * 1.3 + 0.06 if on else d / 2 + 0.08  # clear of the ring around the active warehouse
            if left:
                text(slide, x - gap - 3.0, y - 0.14, 3.0, 0.3, run, align=PP_ALIGN.RIGHT, name=f'!!lbl_{k["id"]}')
            else:
                text(slide, x + gap, y - 0.14, 3.0, 0.3, run, name=f'!!lbl_{k["id"]}')


def places(slide, scr, z):
    for p in PLACES:
        if p['size'] != 'big' and z < 4:
            continue
        x, y = scr(p['lon'], p['lat'])
        if not (0 < x < SW and 0 < y < SH):
            continue
        near = z > 4 and any(abs(k['lon'] - p['lon']) < 0.2 and abs(k['lat'] - p['lat']) < 0.2 for k in KHO)
        box(slide, x - 0.035, y - 0.035, 0.07, 0.07, SUB, shape=MSO_SHAPE.OVAL, name=f'!!pl_{p["vi"]}')
        if near:
            text(slide, x - 1, y - 0.36, 2, 0.28, [[(p['vi'], {'size': 12, 'color': SUB, 'bold': True})]], align=PP_ALIGN.CENTER, name=f'!!plt_{p["vi"]}')
        else:
            text(slide, x - 2.08, y - 0.12, 2, 0.28, [[(p['vi'], {'size': 10 if z < 4 else 12, 'color': SUB, 'bold': True})]], align=PP_ALIGN.RIGHT, name=f'!!plt_{p["vi"]}')


def logo(slide):
    pic = slide.shapes.add_picture(os.path.join(public_dir, 'brand/duytan.png'), Inches(0.42), Inches(0.32), height=Inches(0.42))
    pic.name = '!!logo'


def notes(slide, t):
    slide.notes_slide.notes_text_frame.text = t


OVERVIEW = (109.2, 15.6, 1.0, 6.67, 3.85)
CARD_X = 8.15


def card(slide, k):
    x, y, w = CARD_X, 0.55, 4.75
    hub = k.get('hub')
    box(slide, x, y, w, 6.45, WHITE, line=GREEN if hub else BORDER, radius=0.18, name='!!card', line_w=1.5)
    cx, cy = x + 0.28, y + 0.25
    chips = []
    if hub:
        chips.append(('KHO TRUNG TÂM · HUB', GREEN, WHITE))
    chips.append(('MIỀN BẮC · NORTH' if k['region'] == 'north' else 'MIỀN NAM · SOUTH', RGBColor(0xE3, 0xEC, 0xFB), INK))
    if k.get('estimated'):
        chips.append(('Số liệu tạm tính · Estimated', AMBER, WHITE))
    ox = cx
    for label, bg, fg in chips:
        cw = 0.085 * len(label) + 0.3
        c = box(slide, ox, cy, cw, 0.28, bg, radius=0.14)
        tf = c.text_frame
        tf.margin_left = tf.margin_right = Inches(0.06)
        tf.margin_top = tf.margin_bottom = 0
        r = tf.paragraphs[0].add_run()
        r.text = label
        r.font.name, r.font.size, r.font.bold, r.font.color.rgb = FONT, Pt(9), True, fg
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        ox += cw + 0.1
    text(slide, cx, cy + 0.4, w - 0.56, 0.45, [[(k['vi'], {'size': 21, 'bold': True})], [(k['en'], {'size': 11, 'color': SUB})]])
    text(slide, cx, cy + 1.12, w - 0.56, 0.5, [[(k['role'][0], {'size': 13, 'bold': True, 'color': GREEN}), (' · ' + k['role'][1], {'size': 10, 'color': SUB})]])
    text(slide, cx, cy + 1.6, w - 0.56, 0.5, [[(k['address'], {'size': 10, 'color': SUB})]])
    py, ph = cy + 2.15, 1.55
    if k['photos']:
        n = len(k['photos'])
        pw = (w - 0.56 - 0.12 * (n - 1)) / n
        for i, p in enumerate(k['photos']):
            path = os.path.join(public_dir, p)
            pic = slide.shapes.add_picture(path, Inches(cx + i * (pw + 0.12)), Inches(py), Inches(pw), Inches(ph))
            # crop to fill the frame
            iw, ih = pic.image.size
            ar, fr = iw / ih, pw / ph
            if ar > fr:
                c = (1 - fr / ar) / 2
                pic.crop_left = pic.crop_right = c
            else:
                c = (1 - ar / fr) / 2
                pic.crop_top = pic.crop_bottom = c
    else:
        ph_box = box(slide, cx, py, w - 0.56, ph, TILE, line=BORDER, radius=0.1)
        ph_box.line.dash_style = 4
        text(slide, cx, py + 0.5, w - 0.56, 0.6, [[('Hình ảnh đang cập nhật', {'size': 14, 'bold': True, 'color': SUB})], [('Photo coming soon', {'size': 10, 'color': SUB})]], align=PP_ALIGN.CENTER)
    st = k['stats']
    defs = [('area', 'Diện tích', 'Area', 'm²'), ('capacity', 'Sức chứa', 'Capacity', 'tấn'), ('pallets', 'Vị trí pallet', 'Pallet positions', ''),
            ('sku', 'Mã hàng', 'SKU', ''), ('forklifts', 'Xe nâng', 'Forklifts', ''), ('staff', 'Nhân sự', 'Employees', '')]
    tw, th, g = (w - 0.56 - 0.2) / 3, 0.95, 0.1
    for i, (key, vi, en, unit) in enumerate(defs):
        tx, ty = cx + (i % 3) * (tw + g), py + ph + 0.2 + (i // 3) * (th + g)
        box(slide, tx, ty, tw, th, TILE, radius=0.1)
        v = st[key]
        if v is None:
            val = [('—', {'size': 20, 'bold': True})]
        elif isinstance(v, str):
            val = [(v, {'size': 11, 'bold': True})]
        else:
            val = [(nf(v), {'size': 20, 'bold': True, 'color': AMBER_TEXT if k.get('estimated') else INK})]
            if unit:
                val.append((' ' + unit, {'size': 10, 'color': SUB}))
        text(slide, tx + 0.12, ty + 0.1, tw - 0.2, 0.45, [val])
        text(slide, tx + 0.12, ty + 0.55, tw - 0.2, 0.35, [[(vi, {'size': 10, 'bold': True, 'color': SUB}), (' · ' + en, {'size': 8, 'color': SUB})]])


def legend(slide):
    box(slide, 0.42, 6.35, 5.3, 0.8, WHITE, line=BORDER, radius=0.12, name='!!legend')
    text(slide, 0.62, 6.42, 5.0, 0.35, [[('7 kho · 2 miền ', {'size': 16, 'bold': True}), ('7 warehouses · 2 regions', {'size': 10, 'color': SUB})]])
    lx = 0.62
    for col, vi, en in [(GREEN, 'Kho trung tâm', 'Hub'), (BLUE, 'Kho vệ tinh', 'Satellite'), (AMBER, 'Số liệu tạm tính', 'Estimated')]:
        box(slide, lx, 6.84, 0.13, 0.13, col, shape=MSO_SHAPE.OVAL)
        text(slide, lx + 0.2, 6.8, 1.8, 0.25, [[(vi, {'size': 9}), (' · ' + en, {'size': 8, 'color': SUB})]])
        lx += 1.65


def archipelago_labels(slide, scr):
    x, y = scr(112.0, 17.0)
    text(slide, x + 0.1, y - 0.42, 2.2, 0.3, [[('Quần đảo Hoàng Sa', {'size': 10, 'bold': True, 'color': LINE_BLUE})]])
    x, y = scr(115.0, 9.4)
    text(slide, x - 0.45, y + 0.3, 2.2, 0.3, [[('Quần đảo Trường Sa', {'size': 10, 'bold': True, 'color': LINE_BLUE})]])
    x, y = scr(112.6, 13.2)
    text(slide, x - 1, y, 2, 0.3, [[('BIỂN ĐÔNG', {'size': 12, 'bold': True, 'color': RGBColor(0x7D, 0x9C, 0xC9)})]], align=PP_ALIGN.CENTER)


# ---------- slides ----------
# 1. title
s = new_slide(RGBColor(0xF4, 0xF8, 0xFD))
pic = s.shapes.add_picture(os.path.join(public_dir, 'brand/duytan.png'), Inches(SW / 2 - 1.1), Inches(2.1), height=Inches(0.66))
pic.name = '!!logo'
text(s, 1, 3.05, SW - 2, 0.9, [[('Hệ thống kho ', {'size': 44, 'bold': True}), ('Duy Tân', {'size': 44, 'bold': True, 'color': LINE_BLUE})]], align=PP_ALIGN.CENTER)
text(s, 1, 3.95, SW - 2, 0.5, [[('Duy Tan Warehouse Network', {'size': 20, 'color': SUB})]], align=PP_ALIGN.CENTER)
notes(s, 'Giới thiệu hệ thống kho thành phẩm của Duy Tân.')

# 2. overview
s = new_slide()
scr = draw_map(s, OVERVIEW)
archipelago_labels(s, scr)
places(s, scr, 1)
pins(s, scr, labels=False)
legend(s)
logo(s)
add_morph(s)
notes(s, 'Bảy kho thuộc hai miền: một kho tại Bắc Ninh, sáu kho tại khu vực TP. Hồ Chí Minh và Tây Ninh.')


def kho_slide(k):
    z = 9 if k['region'] == 'north' else (34 if k.get('hub') else 30)
    s = new_slide()
    scr = draw_map(s, (k['lon'], k['lat'], z, 4.1, 3.85))
    places(s, scr, z)
    pins(s, scr, active=k['id'], labels=True)
    card(s, k)
    logo(s)
    add_morph(s)
    st = k['stats']
    notes(s, f"{k['vi']}: {k['role'][0]}. Diện tích {nf(st['area'])} m², {nf(st['pallets'])} vị trí pallet." + (' Số liệu tạm tính, cần xác nhận.' if k.get('estimated') else ''))


north = [k for k in KHO if k['region'] == 'north']
south = [k for k in KHO if k['region'] == 'south']
for k in north:
    kho_slide(k)

# south cluster before the single warehouses
s = new_slide()
scr = draw_map(s, (106.5, 10.91, 17, 6.6, 3.75))
places(s, scr, 17)
pins(s, scr, labels=True, label_size=12)
logo(s)
text(s, 0.42, 6.55, 6, 0.6, [[('Miền Nam · 6 kho ', {'size': 20, 'bold': True}), ('South · 6 warehouses', {'size': 12, 'color': SUB})]])
add_morph(s)
notes(s, 'Sáu kho phía Nam tập trung quanh TP. Hồ Chí Minh và Tây Ninh, kho trung tâm là DTLA.')
for k in south:
    kho_slide(k)

# summary
s = new_slide()
scr = draw_map(s, (108.4, 15.6, 1.0, 3.9, 3.85))
archipelago_labels(s, scr)
pins(s, scr, labels=False)
logo(s)
x, y, w = 7.3, 0.7, 5.6
box(s, x, y, w, 6.1, WHITE, line=BORDER, radius=0.18, name='!!card', line_w=1.5)
text(s, x + 0.3, y + 0.25, w - 0.6, 0.6, [[('7 kho · 2 miền', {'size': 24, 'bold': True})], [('7 warehouses · 2 regions', {'size': 11, 'color': SUB})]])
rows = sorted(KHO, key=lambda k: -k['stats']['area'])
mx = max(k['stats']['area'] for k in KHO)
for i, k in enumerate(rows):
    ry = y + 1.15 + i * 0.47
    name = k['vi'].split(' (')[0].replace('Kho ', '') + (' *' if k.get('estimated') else '')
    text(s, x + 0.3, ry, 1.75, 0.3, [[(name, {'size': 11, 'bold': True, 'color': GREEN if k.get('hub') else INK})]])
    box(s, x + 2.1, ry + 0.04, 2.2, 0.22, TILE, radius=0.06)
    bw = max(0.05, 2.2 * k['stats']['area'] / mx)
    box(s, x + 2.1, ry + 0.04, bw, 0.22, GREEN if k.get('hub') else AMBER if k.get('estimated') else BLUE, radius=0.06, name=f'!!bar_{k["id"]}')
    text(s, x + 4.35, ry, 1.0, 0.3, [[(nf(k['stats']['area']) + ' m²', {'size': 11, 'bold': True})]], align=PP_ALIGN.RIGHT)
ty = y + 1.15 + len(rows) * 0.47 + 0.1
for i, (v, vi, en) in enumerate([(nf(sum(k['stats']['area'] for k in KHO)) + ' m²', 'Tổng diện tích', 'Total area'),
                                (nf(sum(k['stats']['pallets'] for k in KHO)), 'Tổng vị trí pallet', 'Total pallet positions')]):
    bx = x + 0.3 + i * 2.55
    box(s, bx, ty, 2.45, 0.9, TILE, radius=0.1)
    text(s, bx + 0.15, ty + 0.08, 2.2, 0.4, [[(v, {'size': 18, 'bold': True})]])
    text(s, bx + 0.15, ty + 0.52, 2.2, 0.3, [[(vi, {'size': 9, 'bold': True, 'color': SUB}), (' · ' + en, {'size': 8, 'color': SUB})]])
text(s, x + 0.3, ty + 1.02, w - 0.6, 0.3, [[('* Số liệu tạm tính, cập nhật sau · Estimated, to be confirmed', {'size': 9, 'color': AMBER_TEXT})]])
add_morph(s)
notes(s, 'Tổng hợp diện tích các kho. Các kho có dấu * đang dùng số liệu tạm tính.')

# end
s = new_slide(RGBColor(0xF4, 0xF8, 0xFD))
pic = s.shapes.add_picture(os.path.join(public_dir, 'brand/duytan.png'), Inches(SW / 2 - 1.1), Inches(2.3), height=Inches(0.66))
pic.name = '!!logo'
text(s, 1, 3.25, SW - 2, 0.9, [[('Hệ thống kho ', {'size': 36, 'bold': True}), ('Duy Tân', {'size': 36, 'bold': True, 'color': LINE_BLUE})]], align=PP_ALIGN.CENTER)
text(s, 1, 4.05, SW - 2, 0.5, [[('Duy Tan Warehouse Network', {'size': 18, 'color': SUB})]], align=PP_ALIGN.CENTER)
add_morph(s)

prs.save(out_path)
print('slides', len(prs.slides), 'vn rings', len(VN_RINGS), 'neighbour rings', len(NB_RINGS))
