"""Part 01 is the original video: upscale to 1080p60, freeze at the planned holds, add the voice-over."""
import json
import subprocess

vo = json.load(open('src/data/voiceover.json'))['parts']['01']
src = 'out/Problem01_goc_480p30.mp4'
holds = sorted(vo['holds'], key=lambda h: h['at'])
edges = [0.0] + [h['at'] for h in holds] + [None]
parts = []
for i in range(len(edges) - 1):
    a, b = edges[i], edges[i + 1]
    trim = f'trim=start={a}' + (f':end={b}' if b is not None else '')
    pad = f",tpad=stop_mode=clone:stop_duration={holds[i]['dur']:.3f}" if i < len(holds) else ''
    parts.append(f'[v0]{trim},setpts=PTS-STARTPTS{pad}[s{i}]')
n = len(parts)
split = f"[0:v]scale=1920:1080:flags=lanczos,fps=60,split={n}" + ''.join(f'[v{i}]' for i in range(n)) + ';'
fc = split + ';'.join(p.replace('[v0]', f'[v{i}]', 1) for i, p in enumerate(parts))
fc += ';' + ''.join(f'[s{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0[v]'
inputs = ['-i', src]
for k, a in enumerate(vo['audio']):
    inputs += ['-i', 'public/' + a['file']]
    ms = int(a['start'] * 1000)
    fc += f';[{k + 1}:a]adelay={ms}|{ms}[a{k}]'
fc += ';' + ''.join(f'[a{k}]' for k in range(len(vo['audio']))) + f"amix=inputs={len(vo['audio'])}:normalize=0,apad[a]"
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
                '-t', f"{vo['seconds']:.3f}", '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', 'out/Problem01VO.mp4'], check=True)
