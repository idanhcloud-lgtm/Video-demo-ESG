"""Write docs/kich-ban-cuoi-cung.md from src/data/voiceV4.json (the lines exactly as recorded, with timings)."""
import json

d = json.load(open('src/data/voiceV4.json'))
sc = d['scenes']
r0 = sc['title']['seconds']
q0 = r0 + sc['race']['seconds']
k0 = q0 + sc['p04']['seconds']
e0 = k0 + sc['ket']['seconds']
rb = {k: r0 + v / 30 for k, v in sc['race']['beats'].items()}
SEC = [(0, '1. Mở đầu'), (rb['dots'], '2. Mô phỏng hai lộ trình'), (rb['dist'], '3. So sánh quãng đường'), (rb['tabs'] - 3, '4. Chuyển sang hạn chế'),
       (rb['p1'], '5. Hạn chế 01 – Điểm gần nhau khác dãy không hạ liên tiếp'), (rb['p2'], '6. Hạn chế 02 – Lối ngang chưa được sử dụng tối ưu'),
       (rb['p3'], '7. Hạn chế 03 – Hàng rải rác nhiều dãy'), (q0, '8. Hạn chế 04 – Ùn tắc đầu ca sáng'), (k0, '9. Tổng kết'), (e0, '10. Câu kết')]
mm = lambda t: f'{int(t // 60)}:{int(t % 60):02d}'
out = ['# Kịch bản cuối cùng – Video mô phỏng tối ưu lộ trình reach truck', '',
       f"Bản dựng: composition `CondensedVoiceEN` (phụ đề tiếng Anh chính). Thời lượng {mm(d['total'])}. Lời đọc đúng theo file giọng đã thu (`audio/v4/`).", '',
       '| Mốc | Lời đọc (tiếng Việt) | Phụ đề tiếng Anh |', '|---|---|---|']
i = 0
for s in d['subs']:
    while i < len(SEC) and s['at'] >= SEC[i][0] - 0.01:
        out.append(f'| | **{SEC[i][1]}** | |')
        i += 1
    out.append(f"| {mm(s['at'])} | {s['vi']} | {s['en']} |")
out += ['', '## Ghi chú',
        '- Số liệu: 1.166 m / 1.596 m, chênh 430 m (≈27%) – theo bản đồ Kho C hiện tại (VT 1,4 m, tim lối 8,65 m), cùng công thức với app.',
        '- Thuật ngữ: hạ hàng, liên tiếp, lối ngang.']
open('docs/kich-ban-cuoi-cung.md', 'w').write('\n'.join(out) + '\n')
print('written', mm(d['total']))
