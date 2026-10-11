#!/usr/bin/env bash
# Full video with voice-over. Run after: python3 tools/voiceover_plan.py
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build_part01.py
for c in Problem02VO Problem03VO Problem04VO SummaryVO; do npx remotion render "$c" "out/$c.mp4" --log=error; done
in=(); f=""; for i in 0 1 2 3 4; do f+="[$i:v]fps=60,setsar=1[v$i];[$i:a]aresample=48000[a$i];"; done
ffmpeg -v error -y -i out/Problem01VO.mp4 -i out/Problem02VO.mp4 -i out/Problem03VO.mp4 -i out/Problem04VO.mp4 -i out/SummaryVO.mp4 \
  -filter_complex "${f}[v0][a0][v1][a1][v2][a2][v3][a3][v4][a4]concat=n=5:v=1:a=1[v][a];[a]loudnorm=I=-16:TP=-1.5:LRA=11[an]" \
  -map "[v]" -map "[an]" -c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart out/Video_ReachTruck_full_1080p60.mp4
