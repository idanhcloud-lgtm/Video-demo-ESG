"""Same plan as voice_v4_plan.py, driven by the English voice files (audio/en/E1, E1b, E2, E3, E5.mp3).

The voice is cut into blocks at its own pauses; each block is placed where its picture happens, and the
scene beats (30-per-second units, relative to each scene) are derived from those placements.
Output: public/audio/en/<block>.wav and src/data/voiceEN.json (scene durations + beats, audio blocks, subtitles).
"""
import json
import os
import subprocess

U = 30  # timeline units per second

# Sentence pieces inside each file: (file, start, end, vi, en). Times measured from the pauses in the recordings.
SEG = {
    'title': ('E1', 0.00, 2.89, 'Tối ưu lộ trình xe reach truck bằng thuật toán.', 'Algorithm-based route optimization for reach trucks.'),
    'cmp': ('E1', 4.45, 8.43, 'Để so sánh, chúng tôi mô phỏng cùng một phiếu TO có 28 điểm hạ hàng.', 'To compare, we simulate one TO with 28 put-away stops.'),
    'left': ('E1', 8.86, 12.17, 'Bên trái, xe đi theo lộ trình do thuật toán sắp xếp.', 'On the left, the truck follows the route sequenced by the algorithm.'),
    'right': ('E1', 12.65, 17.14, 'Bên phải, xe đi theo cách đang làm tại kho: lần lượt từ dãy A đến T.', "On the right, it follows today's practice: aisle by aisle from A to T."),
    'start': ('E1', 18.25, 20.80, 'Hai xe cùng xuất phát, cùng tốc độ.', 'Both trucks start together, at the same speed.'),
    'finish': ('E1', 21.34, 25.55, 'Xe theo lộ trình tối ưu đã về đích, trong khi xe đi theo dãy vẫn còn đang chạy.', 'The optimized truck has finished, while the aisle-order truck is still driving.'),
    'dist1': ('E1b', 0.00, 9.72, 'Cùng 28 điểm hạ hàng, lộ trình tối ưu chạy 1.166 m. Cách hiện tại chạy 1.596 m.', "With the same 28 stops, the optimized route drives 1,166 m. Today's order drives 1,596 m."),
    'dist2': ('E1b', 11.25, 17.27, 'Ngắn hơn khoảng 430 m, tức khoảng 27%, chỉ trong một phiếu TO.', 'That is about 430 m shorter, roughly 27%, on a single TO.'),
    'why': ('E1b', 18.29, 21.93, 'Vì sao có chênh lệch này? Quy trình hiện tại có 4 hạn chế.', 'Why the difference? The current process has 4 limitations.'),
    'look': ('E1b', 22.30, 23.75, 'Chúng ta xem lần lượt từng hạn chế trên bản đồ.', "Let's look at each one on the map."),
    'p1a': ('E2', 0.00, 4.30, 'Một: các điểm gần nhau nhưng khác dãy không được hạ hàng liên tiếp.', 'First: nearby stops in different aisles are not handled in sequence.'),
    'p1b': ('E2', 4.69, 10.93, 'Các điểm này nằm sát nhau, nhưng vì phiếu in theo thứ tự dãy, điểm bên cạnh chưa tới lượt.', 'They sit side by side, but the TO is printed in aisle order, so the neighbour is not next on the list.'),
    'p1b2': ('E2', 11.48, 18.48, 'Khi đi ngang qua, tài xế không biết ngay bên cạnh còn hàng cần hạ, nên xe phải quay lại khu vực này lần thứ hai.', 'Passing by, the driver does not know there is a stop right next door – so the truck has to come back a second time.'),
    'p1c': ('E2', 19.78, 24.17, 'Với thuật toán, các điểm này được sắp liền nhau trên phiếu. Xe chỉ vào một lần là hạ hàng xong.', 'With the algorithm, these stops are listed back to back. One visit is enough.'),
    'p2a': ('E2', 25.21, 29.22, 'Hai: lối đi ngang chưa được sử dụng tối ưu trong một số trường hợp.', 'Second: in some cases, the cross aisles are not used optimally.'),
    'p2b': ('E2', 29.65, 35.19, 'Sau khi hạ hàng ở sâu trong dãy, xe phải chạy ngược ra đầu dãy để hạ thêm một điểm, rồi mới đổi lối.', 'After a stop deep in the aisle, the truck runs back to the front for one more stop before changing aisle.'),
    'p2c': ('E2', 36.32, 41.37, 'Với thuật toán, xe đổi lối ngay tại lối ngang gần nhất, không cần quay ra đầu dãy.', 'With the algorithm, the truck changes aisle at the nearest cross aisle – no trip back to the front.'),
    'p2d': ('E2', 41.84, 44.00, 'Điểm gần đầu dãy được hạ hàng trên đường quay về.', 'The stop near the front is handled on the way back.'),
    'p3a': ('E2', 44.91, 50.86, 'Ba: hàng trong phiếu TO nằm rải rác ở nhiều dãy, nên xe dễ chạy thừa đường.', 'Third: the stops of a TO are scattered over many aisles, so the truck easily drives extra distance.'),
    'p3b': ('E2', 51.35, 53.34, 'Để dễ so sánh, thử duỗi thẳng hai lộ trình ra.', "To compare, let's straighten both routes."),
    'p3c': ('E2', 54.32, 57.94, 'Phần dây đỏ dài hơn chính là quãng đường xe hiện tại đang chạy thừa.', 'The extra red length is the distance the truck drives for nothing today.'),
    'p3d': ('E2', 58.32, 60.25, 'Lộ trình tối ưu đã cắt bỏ phần chạy thừa này.', 'The optimized route cuts this waste.'),
    'p4a': ('E3', 0.00, 2.92, 'Bốn: ùn tắc đầu ca sáng.', 'Fourth: congestion at the start of the morning shift.'),
    'p4b': ('E3', 3.28, 10.04, 'Sau khi nhận phiếu TO, các xe nâng cùng lúc dồn về những dãy đầu, gây ùn tắc và tiềm ẩn nguy cơ va chạm.', 'After picking up their TOs, the forklifts all head for the first aisles at once – congestion and a risk of collisions.'),
    'p4b2': ('E3', 10.56, 15.04, 'Vì phiếu in sẵn theo thứ tự dãy, tài xế nào cũng bắt đầu từ dãy A và B.', 'Because TOs are printed in aisle order, every driver starts in aisles A and B.'),
    'p4d': ('E3', 16.22, 19.20, 'Chỉ 3 xe hạ xong và rẽ ra lối ngang.', 'Only three trucks finish there and turn off at the cross aisle.'),
    'p4e': ('E3', 19.65, 24.00, '6 xe còn lại vẫn còn điểm ở cuối dãy, phải đi tiếp, nên bị kẹt ở giữa dãy.', 'The other six still have stops further down, so they get stuck in the middle of the aisle.'),
    'p4f': ('E3', 24.97, 28.07, 'Với thuật toán, xe không phải đi hết từng dãy.', "With the algorithm, trucks don't run each aisle to the end."),
    'p4g': ('E3', 28.42, 34.65, 'Các điểm được sắp theo vùng, tới lối ngang là xe rẽ đi ngay, hạn chế cảnh dồn xe lúc đầu ca.', 'Stops are grouped by zone; at the cross aisle each truck turns off right away – less crowding at shift start.'),
    'v5a': ('E5', 0.00, 4.30, 'Trên đây là phần mô phỏng giải pháp tối ưu lộ trình xe reach truck bằng thuật toán.', 'That was the simulation of our algorithm-based route optimization for reach trucks.'),
    'v5b': ('E5', 4.72, 8.48, 'Tiếp theo, chúng tôi xin trình bày kết quả chạy mô phỏng trên các phiếu TO trong một tháng.', 'Next, we present the results of simulating one month of TOs.'),
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
x = place('dist', R['dist'] + 0.5, 'dist1', 'dist2')
R['distDiff'] = x['dist2'][0]
after = x['dist2'][1]
x = place('why', after + 0.8, 'why', 'look')  # same file as dist (E1b)
R['tabs'] = x['why'][0] + 1.55       # "Quy trình hiện tại có 4 hạn chế"
R['p1'] = x['look'][1] + 0.5
x = place('p1', R['p1'] + 0.3, 'p1a', 'p1b', 'p1b2')
R['p1Trace'] = x['p1b'][0]
R['p1Callout'] = x['p1b2'][1] + 0.5
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
x = place('p4a', Q['cardIn'] + 0.4, 'p4a', 'p4b', 'p4b2')
Q['cardOut'] = x['p4a'][1] + 0.3
Q['panelsIn'] = Q['cardOut'] + 0.5
Q['clock'] = x['p4b'][0]
Q['drive'] = x['p4b2'][0]           # "tài xế nào cũng bắt đầu từ dãy A và B"
x = place('p4d', x['p4b2'][1] + 0.6, 'p4d', 'p4e')
Q['zoomIn'] = x['p4e'][0]
Q['jam'] = x['p4e'][0] + 3.4         # "nên bị kẹt ở giữa dãy"
x = place('p4f', x['p4e'][1] + 0.6, 'p4f', 'p4g')
Q['callout'] = x['p4f'][0]
Q['zoomOut'] = x['p4g'][1] + 0.3
Q['solved'] = Q['zoomOut'] + 1.0
Q['end'] = Q['solved'] + 2.4
p4_beats = {k: round((v - q0) * U) for k, v in Q.items()}
p4_dur = Q['end'] - q0
t = Q['end']

# ---- Closing recap (whole V4 kept as recorded) – dropped from the video (RECAP = False) ----
RECAP = False
c0 = t
if RECAP:
    x = place('ket', c0 + 0.8, 'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6')
    off = c0 + 0.8 - SEG['k0'][1]
    C = {'intro': c0, 'i1': x['k1'][0], 'i2': x['k2'][0], 'i3': x['k3'][0], 'i4': x['k4'][0], 'fix': x['k5'][0],
         'b1': K6_WORDS[0] + off, 'b2': K6_WORDS[1] + off, 'b3': K6_WORDS[2] + off}
    C['end'] = x['k6'][1] + 1.8
else:
    C = {'end': c0}
ket_beats = {k: round((v - c0) * U) for k, v in C.items()}
ket_dur = C['end'] - c0

# ---- End card (V5) ----
e0 = C['end']
x = place('v5', e0 + 0.8, 'v5a', 'v5b')
E = {'next': x['v5b'][0], 'end': x['v5b'][1] + 2.2}
end_beats = {k: round((v - e0) * U) for k, v in E.items()}
end_dur = E['end'] - e0
total = E['end']

# ---- cut audio blocks ----
audio = []
for name, f, a, b, at in blocks:
    out = f'public/audio/en/{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'audio/en/{f}.mp3', '-ss', f'{a:.3f}', '-to', f'{b + 0.12:.3f}',
                    '-af', 'afade=t=in:d=0.02', '-ar', '48000', '-ac', '2', out], check=True)
    audio.append({'file': f'audio/en/{name}.wav', 'at': round(at, 3)})

data = {
    'total': round(total, 3),
    'scenes': {
        'title': {'seconds': round(title_dur, 3)},
        'race': {'seconds': round(race_dur, 3), 'beats': race_beats},
        'p04': {'seconds': round(p4_dur, 3), 'beats': p4_beats},
        'ket': {'seconds': round(ket_dur, 3), 'beats': ket_beats},
        'end': {'seconds': round(end_dur, 3), 'beats': end_beats},
    },
    'audio': audio,
    'subs': [{'at': round(a, 3), 'end': round(e + 0.25, 3), 'vi': vi, 'en': en} for a, e, vi, en in subs],
}
json.dump(data, open('src/data/voiceEN.json', 'w'), ensure_ascii=False, indent=1)
print(f'total {total:.1f}s  title {title_dur:.1f}  race {race_dur:.1f}  p04 {p4_dur:.1f}  ket {ket_dur:.1f}  end {end_dur:.1f}')
print('race', race_beats)
print('p04', p4_beats)
print('ket', ket_beats)
