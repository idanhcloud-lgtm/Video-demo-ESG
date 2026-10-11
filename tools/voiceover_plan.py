"""Cut the ElevenLabs part files into sentences and plan where each scene must hold.

Input : audio/raw/{P01,P02,P03,P04,PKET}.mp3 (one file per part, sentences separated by pauses)
Output: public/audio/<code>.wav per sentence, src/data/voiceover.json (holds + audio start times)
"""
import json
import subprocess

FPS_UNITS = 30  # scene timelines are written in 30-per-second units

# Sentence boundaries (seconds) inside each part file, found from the pauses between sentences.
CUTS = {
    'P01': [10.95, 21.14, 35.97, 44.15, 51.41],
    'P02': [9.79, 12.96, 28.97],
    'P03': [7.16, 15.11, 23.52, 27.70, 35.20],
    'P04': [8.35, 13.79, 24.10, 37.74],
    'PKET': [3.25, 11.12, 18.50, 26.14, 34.52],
}
CODES = {'P01': '01', 'P02': '02', 'P03': '03', 'P04': '04', 'PKET': 'KET'}

# For each sentence: (cue, hold_at) in scene time. cue = popup it belongs to; hold_at = frame to freeze on
# if the sentence runs past the next popup. Part 01 is in seconds (original video), the rest in units.
PLAN = {
    '01': {'unit': 1, 'end': 69.8, 'cues': [(0.3, 5.5), (6.0, 11.8), (12.0, 32.5), (33.0, 44.3), (46.5, 49.6), (50.0, 69.6)]},
    '02': {'unit': FPS_UNITS, 'end': 630, 'cues': [(45, 145), (175, 320), (330, 495), (540, 625)]},
    '03': {'unit': FPS_UNITS, 'end': 990, 'cues': [(45, 145), (190, 315), (320, 695), (700, 785), (790, 895), (900, 985)]},
    '04': {'unit': FPS_UNITS, 'end': 820, 'cues': [(45, 145), (190, 230), (260, 465), (505, 685), (730, 815)]},
    'KET': {'unit': FPS_UNITS, 'end': 990, 'cues': [(20, 95), (100, 245), (250, 395), (400, 545), (550, 715), (720, 985)]},
}
LEAD = 0.3   # s between popup and voice
GAP = 0.45   # s of silence kept before the next popup
TAIL = 0.8   # s after the last sentence before the scene ends


def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]))


def cut_sentences():
    lengths = {}
    trim = 'silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse'
    for part, cuts in CUTS.items():
        src = f'audio/raw/{part}.mp3'
        bounds = [0.0] + cuts + [duration(src)]
        for k in range(len(bounds) - 1):
            code = f'{CODES[part]}-{k + 1}'
            out = f'public/audio/{code}.wav'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ss', f'{bounds[k]:.3f}', '-to', f'{bounds[k + 1]:.3f}',
                            '-af', trim, '-ar', '48000', '-ac', '2', out], check=True)
            lengths[code] = duration(out)
    return lengths


def plan(lengths):
    result = {}
    for part, p in PLAN.items():
        u = p['unit']
        holds = []  # (at, dur) in scene units

        def out(t):
            return t + sum(d for a, d in holds if a < t)

        audio = []
        for k, (cue, hold_at) in enumerate(p['cues']):
            code = f'{part}-{k + 1}'
            start = out(cue) + LEAD * u
            end = start + lengths[code] * u
            audio.append({'file': f'audio/{code}.wav', 'start': start / u})
            nxt = p['cues'][k + 1][0] if k + 1 < len(p['cues']) else p['end']
            need = end + (GAP if k + 1 < len(p['cues']) else TAIL) * u - out(nxt)
            if need > 0:
                holds.append((hold_at, need))
        total = p['end'] + sum(d for _, d in holds)
        result[part] = {
            'unit': u,
            'holds': [{'at': a, 'dur': d} for a, d in holds],
            'audio': audio,
            'seconds': total / u,
        }
    return result


if __name__ == '__main__':
    L = cut_sentences()
    R = plan(L)
    json.dump({'lengths': L, 'parts': R}, open('src/data/voiceover.json', 'w'), indent=1)
    for k, v in R.items():
        print(k, f"{v['seconds']:.1f}s", 'holds', [(round(h['at'], 1), round(h['dur'] / v['unit'], 1)) for h in v['holds']])
