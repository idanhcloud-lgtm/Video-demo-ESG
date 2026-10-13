"""Plan the condensed video around the final ElevenLabs v4 voice files (audio/v4/V1..V4.mp3).

The voice is cut into blocks at its own pauses; each block is placed where its picture happens, and the
scene beats (30-per-second units, relative to each scene) are derived from those placements.
Output: public/audio/v4/<block>.wav and src/data/voiceV4.json (scene durations + beats, audio blocks, subtitles).
"""
import json
import os
import subprocess

U = 30  # timeline units per second

# Sentence pieces inside each file: (file, start, end, vi, en). Times measured from the pauses in the recordings.
SEG = {
    'title': ('V1', 0.00, 2.44, 'Tối ưu lộ trình xe reach truck bằng thuật toán.', 'Algorithm-based route optimization for reach trucks.'),
    'cmp': ('V1', 4.08, 8.27, 'Để so sánh, chúng tôi mô phỏng cùng một phiếu TO có 28 điểm hạ hàng.', 'To compare, we simulate one TO with 28 put-away stops.'),
    'left': ('V1', 8.84, 11.62, 'Bên trái, xe đi theo lộ trình do thuật toán sắp xếp.', 'On the left, the truck follows the route sequenced by the algorithm.'),
    'right': ('V1', 12.19, 16.62, 'Bên phải, xe đi theo cách đang làm tại kho: lần lượt từ dãy A đến T.', 'On the right, it follows today\'s practice: aisle by aisle from A to T.'),
    'start': ('V1', 17.77, 19.67, 'Hai xe cùng xuất phát, cùng tốc độ.', 'Both trucks start together, at the same speed.'),
    'finish': ('V1', 20.16, 24.55, 'Xe theo lộ trình tối ưu đã về đích, trong khi xe đi theo dãy vẫn còn đang chạy.', 'The optimized truck has finished, while the aisle-order truck is still driving.'),
    'why': ('V1', 25.31, 28.48, 'Vì sao có chênh lệch này? Quy trình hiện tại có 4 hạn chế.', 'Why the difference? The current process has 4 limitations.'),
    'look': ('V1', 28.91, 30.94, 'Chúng ta xem lần lượt từng hạn chế trên bản đồ.', 'Let\'s look at each one on the map.'),
    'p1a': ('V2', 0.00, 2.75, 'Một: các điểm gần nhau không được hạ hàng liên tiếp.', 'One: nearby stops are not handled in sequence.'),
    'p1b': ('V2', 3.34, 7.82, 'Các điểm nằm sát nhau nhưng khác dãy, nên xe hiện tại phải vào khu vực này 2 lần.', 'They sit close together but in different aisles, so today the truck enters this area twice.'),
    'p1c': ('V2', 9.44, 13.78, 'Thuật toán sắp các điểm này liên tiếp. Xe chỉ vào khu vực 1 lần là hạ hàng xong.', 'The algorithm puts them in sequence – one visit to the area is enough.'),
    'p2a': ('V2', 14.88, 17.53, 'Hai: lối đi ngang chưa được sử dụng tối ưu.', 'Two: cross aisles are not used optimally.'),
    'p2b': ('V2', 17.99, 23.66, 'Xe hiện tại hạ xong điểm ở sâu trong dãy, quay ra đầu dãy để đổi lối, rồi lại vào sâu dãy bên cạnh.', 'After a stop deep in the aisle, the truck goes back to the front to change aisle, then deep again.'),
    'p2c': ('V2', 24.81, 28.79, 'Thuật toán cho xe đổi lối ngay tại lối ngang gần đó, không phải quay ra đầu dãy.', 'The algorithm changes aisle at the nearby cross aisle – no trip back to the front.'),
    'p2d': ('V2', 29.30, 32.44, 'Các điểm gần đầu dãy được hạ hàng trên đường quay về.', 'Stops near the front are handled on the way back.'),
    'p3a': ('V2', 33.25, 35.50, 'Ba: hàng nằm rải rác nhiều dãy.', 'Three: stops are scattered over many aisles.'),
    'p3b': ('V2', 35.92, 38.17, 'Thử duỗi thẳng 2 lộ trình ra để so độ dài.', 'Let\'s straighten both routes and compare their length.'),
    'p3c': ('V2', 39.22, 41.70, 'Phần dây đỏ dài hơn chính là quãng đường chạy thừa.', 'The extra red length is the wasted travel.'),
    'p3d': ('V2', 42.15, 44.08, 'Lộ trình tối ưu giảm phần chạy thừa này.', 'The optimized route cuts this waste.'),
    'p4a': ('V3', 0.00, 2.77, 'Bốn: ùn tắc dãy A, B buổi sáng.', 'Four: morning congestion in aisles A, B.'),
    'p4b': ('V3', 3.19, 10.65, 'Đầu ca sáng, sau khi nhân viên xe nâng nhận phiếu TO, ai cũng bắt đầu hạ hàng từ dãy A và B, vì phiếu đã in sẵn theo thứ tự dãy.', 'At the start of the morning shift, every driver begins in aisles A and B – the TOs are printed in aisle order.'),
    'p4c': ('V3', 12.19, 14.25, 'Các xe cùng dồn vào dãy A, B.', 'All trucks crowd into aisles A, B.'),
    'p4d': ('V3', 14.80, 18.41, 'Chỉ 3 xe rẽ ra lối ngang, vì đã hạ xong các điểm trong 2 dãy này.', 'Only 3 turn off at the cross aisle – they are done with these two aisles.'),
    'p4e': ('V3', 18.81, 22.66, '6 xe còn điểm ở cuối dãy, phải đi tiếp, nên kẹt ở giữa dãy.', 'The other 6 still have stops further down, so they get stuck mid-aisle.'),
    'p4f': ('V3', 23.91, 26.65, 'Với lộ trình tối ưu, xe không phải đi hết từng dãy.', 'With the optimized route, trucks don\'t run each aisle to the end.'),
    'p4g': ('V3', 27.14, 33.56, 'Thuật toán sắp các điểm theo vùng, tới lối ngang là xe rẽ sang vùng của mình, hạn chế việc dồn vào cùng một chỗ lúc đầu ca.', 'Stops are grouped by zone; at the cross aisle each truck turns to its own zone – less crowding at shift start.'),
    'k0': ('V4', 0.24, 2.40, 'Nhìn lại 4 hạn chế của cách đi hiện tại.', 'Looking back at the 4 limitations of today\'s routing.'),
    'k1': ('V4', 3.90, 6.91, 'Một: các điểm gần nhau không được hạ hàng liên tiếp.', 'One: nearby stops are not handled in sequence.'),
    'k2': ('V4', 7.97, 10.83, 'Hai: lối đi ngang chưa được sử dụng tối ưu.', 'Two: cross aisles are not used optimally.'),
    'k3': ('V4', 11.64, 14.41, 'Ba: hàng rải rác, xe chạy thừa nhiều.', 'Three: scattered stops, a lot of extra travel.'),
    'k4': ('V4', 15.20, 18.01, 'Bốn: ùn tắc dãy A, B buổi sáng.', 'Four: morning congestion in aisles A, B.'),
    'k5': ('V4', 18.77, 23.31, 'Thuật toán khắc phục các hạn chế này bằng việc sắp xếp lại thứ tự hạ hàng một cách tối ưu hơn.', 'The algorithm addresses them by re-sequencing the put-away stops more efficiently.'),
    'k6': ('V4', 24.06, 28.20, 'Quãng đường ngắn hơn, ít ùn tắc hơn, tiết kiệm điện năng cho mỗi chuyến xe nâng.', 'Shorter travel, less congestion, energy saved on every forklift trip.'),
}
# Inside k6: when each benefit is spoken (file time).
K6_WORDS = [24.06, 25.26, 26.42]

DIST_TXT = [
    ('Cùng 28 điểm hạ hàng, lộ trình tối ưu chạy 1.166 m. Cách hiện tại chạy 1.596 m.', 'Same 28 stops: the optimized route drives 1,166 m, today\'s order 1,596 m.'),
    ('Ngắn hơn khoảng 430 m, tức khoảng 27%, chỉ trong một phiếu TO.', 'About 430 m shorter – roughly 27% – on a single TO.'),
]


def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))


def pauses(path, db=-40, d=0.45):
    log = subprocess.run(['ffmpeg', '-v', 'info', '-i', path, '-af', f'silencedetect=n={db}dB:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(l.split('silence_start: ')[1]) for l in log.splitlines() if 'silence_start' in l]
    en = [float(l.split('silence_end: ')[1].split()[0]) for l in log.splitlines() if 'silence_end' in l]
    return list(zip(st, en))


RACE_UNITS = 360          # race length is fixed (keeps the truck speed of the original)
GREEN_FINISH = 0.7316 * RACE_UNITS / U  # s after race start (track length ratio)

blocks = []   # (name, file, from, to, at_abs)
subs = []     # (at, end, vi, en)


def place(name, at, *pieces, split=True):
    """Play pieces (contiguous in one file) as one block starting at `at` (absolute s). Returns {piece: abs start/end}."""
    f, a0, _, _, _ = SEG[pieces[0]]
    a1 = SEG[pieces[-1]][2]
    blocks.append((name, f, a0, a1, at))
    out = {}
    for p in pieces:
        _, s, e, vi, en = SEG[p]
        out[p] = (at + s - a0, at + e - a0)
        subs.append((out[p][0], out[p][1], vi, en))
    return out


t = 0.0
# ---- Title ----
title0 = t
x = place('title', t + 0.5, 'title')
title_dur = x['title'][1] + 0.9 - title0
t = title0 + title_dur

# ---- Race + 01..03 (MainRace) ----
r0 = t
R = {}
x = place('cmp', r0 + 0.5, 'cmp', 'left', 'right')
R['spotL'], R['spotR'], R['spotEnd'] = x['left'][0], x['right'][0], x['right'][1] + 0.2
R['race'] = x['right'][1] + 0.6
x = place('start', R['race'] + 0.1, 'start')
R['raceEnd'] = R['race'] + RACE_UNITS / U
x = place('finish', R['race'] + GREEN_FINISH - 1.6, 'finish')
# Distance comparison (V1b). Until V1b.mp3 exists, keep its planned length and show its text as subtitles.
R['dist'] = max(R['raceEnd'] + 0.3, x['finish'][1] + 0.4)
if os.path.exists('audio/v4/V1b.mp3'):
    sil = pauses('audio/v4/V1b.mp3')
    cut = max(sil, key=lambda p: p[1] - p[0])  # the [long pause] between the two sentences
    SEG['dist1'] = ('V1b', 0.0, cut[0], DIST_TXT[0][0], DIST_TXT[0][1])
    SEG['dist2'] = ('V1b', cut[1], duration('audio/v4/V1b.mp3'), DIST_TXT[1][0], DIST_TXT[1][1])
    x = place('dist', R['dist'] + 0.5, 'dist1', 'dist2')
    R['distDiff'] = x['dist2'][0]
    after = x['dist2'][1]
else:
    a = R['dist'] + 0.5
    subs.append((a, a + 6.2, *DIST_TXT[0]))
    subs.append((a + 7.0, a + 11.0, *DIST_TXT[1]))
    R['distDiff'] = a + 7.0
    after = a + 11.0
x = place('why', after + 0.8, 'why', 'look')
R['tabs'] = x['why'][0] + 1.55       # "Quy trình hiện tại có 4 hạn chế"
R['p1'] = x['look'][1] + 0.5
x = place('p1', R['p1'] + 0.3, 'p1a', 'p1b')
R['p1Trace'] = x['p1b'][0]
R['p1Callout'] = x['p1b'][1] + 0.5
x = place('p1c', R['p1Callout'] + 0.3, 'p1c')
R['p1Solved'] = x['p1c'][1] + 0.2
R['p2'] = R['p1Solved'] + 1.3
x = place('p2', R['p2'] + 0.3, 'p2a', 'p2b')
R['p2Trace'] = x['p2b'][0]
R['p2Callout'] = x['p2b'][1] + 0.5
x = place('p2c', R['p2Callout'] + 0.3, 'p2c', 'p2d')
R['p2Solved'] = x['p2d'][1] + 0.2
R['p3'] = R['p2Solved'] + 1.3
x = place('p3', R['p3'] + 0.3, 'p3a', 'p3b')
R['p3Flash'] = x['p3a'][0] + 0.6
R['p3Ropes'] = x['p3b'][0]
R['p3Waste'] = max(R['p3Ropes'] + 95 / U, x['p3b'][1] + 0.5)
x = place('p3c', R['p3Waste'], 'p3c', 'p3d')
R['p3Solved'] = x['p3d'][0] + 0.3
R['end'] = x['p3d'][1] + 2.2
race_beats = {k: round((v - r0) * U) for k, v in R.items()}
race_beats['dots'] = 0
race_dur = R['end'] - r0
t = R['end']

# ---- Problem 04 ----
q0 = t
Q = {'glow': q0 + 0.6, 'cardIn': q0 + 1.3}
x = place('p4a', Q['cardIn'] + 0.4, 'p4a', 'p4b')
Q['cardOut'] = x['p4a'][1] + 0.3
Q['panelsIn'] = Q['cardOut'] + 0.5
Q['clock'] = x['p4b'][0]
Q['drive'] = x['p4b'][0] + 3.6       # "ai cũng bắt đầu hạ hàng từ dãy A và B"
x = place('p4c', x['p4b'][1] + 0.5, 'p4c', 'p4d', 'p4e')
Q['zoomIn'] = x['p4e'][0]
Q['jam'] = x['p4e'][0] + 2.7         # "nên kẹt ở giữa dãy"
x = place('p4f', x['p4e'][1] + 0.6, 'p4f', 'p4g')
Q['callout'] = x['p4f'][0]
Q['zoomOut'] = x['p4g'][1] + 0.3
Q['solved'] = Q['zoomOut'] + 1.0
Q['end'] = Q['solved'] + 2.4
p4_beats = {k: round((v - q0) * U) for k, v in Q.items()}
p4_dur = Q['end'] - q0
t = Q['end']

# ---- Closing recap (whole V4 kept as recorded) ----
c0 = t
x = place('ket', c0 + 0.8, 'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6')
off = c0 + 0.8 - SEG['k0'][1]
C = {'intro': c0, 'i1': x['k1'][0], 'i2': x['k2'][0], 'i3': x['k3'][0], 'i4': x['k4'][0], 'fix': x['k5'][0],
     'b1': K6_WORDS[0] + off, 'b2': K6_WORDS[1] + off, 'b3': K6_WORDS[2] + off}
C['end'] = x['k6'][1] + 2.8
ket_beats = {k: round((v - c0) * U) for k, v in C.items()}
ket_dur = C['end'] - c0
total = C['end']

# ---- cut audio blocks ----
audio = []
for name, f, a, b, at in blocks:
    out = f'public/audio/v4/{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'audio/v4/{f}.mp3', '-ss', f'{a:.3f}', '-to', f'{b + 0.12:.3f}',
                    '-af', 'afade=t=in:d=0.02', '-ar', '48000', '-ac', '2', out], check=True)
    audio.append({'file': f'audio/v4/{name}.wav', 'at': round(at, 3)})

data = {
    'total': round(total, 3),
    'scenes': {
        'title': {'seconds': round(title_dur, 3)},
        'race': {'seconds': round(race_dur, 3), 'beats': race_beats},
        'p04': {'seconds': round(p4_dur, 3), 'beats': p4_beats},
        'ket': {'seconds': round(ket_dur, 3), 'beats': ket_beats},
    },
    'audio': audio,
    'subs': [{'at': round(a, 3), 'end': round(e + 0.25, 3), 'vi': vi, 'en': en} for a, e, vi, en in subs],
}
json.dump(data, open('src/data/voiceV4.json', 'w'), ensure_ascii=False, indent=1)
print(f'total {total:.1f}s  title {title_dur:.1f}  race {race_dur:.1f}  p04 {p4_dur:.1f}  ket {ket_dur:.1f}')
print('race', race_beats)
print('p04', p4_beats)
print('ket', ket_beats)
