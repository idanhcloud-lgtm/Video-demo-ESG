import React from 'react';
import {DOORS, GAPS, RACKS, TUNNELS} from '../map/khoC';
import {MAP, laneYpx, project, vtX} from '../layout';
import {colors} from '../theme';

const CELL_COLORS = ['#a8834a', '#9c7a52', '#4e8a6a', '#3f7f86', '#3f68a6', '#6c5aa0', '#9a5440', '#b08d4e'];
const AISLE_HALF = 8.3;
const CELL = 6.6;

// Deterministic pseudo-random so every render shows the same bins.
const rand = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const inTunnel = (vt: number) => TUNNELS.some((t) => vt >= t.vtFrom && vt <= t.vtTo);
const inGap = (code: string, vt: number) => (GAPS[code] ?? []).some(([a, b]) => vt >= a && vt <= b);

/** Static Kho C floor plan in the visual style of video part 1. */
export const MapBase: React.FC<{startDoor: string}> = React.memo(({startDoor}) => {
  const rows = RACKS.map((r, ri) => {
    const y = r.side === 'T' ? laneYpx(r.lane) + AISLE_HALF : laneYpx(r.lane) - AISLE_HALF - CELL;
    const segs: [number, number][] = [];
    let start = -1;
    for (let v = 1; v <= r.vtMax + 1; v++) {
      const ok = v <= r.vtMax && !inTunnel(v) && !inGap(r.code, v);
      if (ok && start < 0) start = v;
      if (!ok && start >= 0) {
        segs.push([start, v - 1]);
        start = -1;
      }
    }
    return (
      <g key={r.code}>
        {segs.map(([a, b]) => (
          <rect key={a} x={vtX(a) - 4} y={y - 1.5} width={vtX(b) - vtX(a) + 8} height={CELL + 3} rx={1.5} fill="#141c2f" />
        ))}
        {segs.flatMap(([a, b]) =>
          Array.from({length: b - a + 1}, (_, k) => a + k)
            .filter((v) => rand(ri, v) > 0.27)
            .map((v) => (
              <rect
                key={v}
                x={vtX(v) - 3}
                y={y}
                width={6}
                height={CELL}
                rx={0.8}
                fill={CELL_COLORS[Math.floor(rand(v, ri + 7) * CELL_COLORS.length)]}
                opacity={0.82}
              />
            )),
        )}
      </g>
    );
  });

  const dashX = [vtX(-1.2), vtX(34), vtX(75), vtX(105)];
  return (
    <g>
      <defs>
        <pattern id="hatch" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={10} height={10} fill="#0d1424" />
          <rect width={3} height={10} fill="#151e33" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={MAP.w} height={MAP.h} fill="#0a1120" />
      {/* dispatch band */}
      <rect x={35} y={4} width={40} height={MAP.h - 8} rx={4} fill="url(#hatch)" />
      <text
        x={0}
        y={0}
        transform={`translate(61 ${MAP.h / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        letterSpacing={1.5}
        fill={colors.amber}
      >
        DISPATCH · 25 DOORS · KHU XUẤT HÀNG
      </text>
      {/* doors */}
      {DOORS.map((d) => {
        const [, y] = project(0, d.y);
        const active = d.id === startDoor;
        return (
          <g key={d.id}>
            <rect x={4} y={y - 8} width={27} height={16} rx={3} fill={active ? colors.yellow : '#121a2c'} stroke={active ? colors.yellow : '#6b5a2a'} strokeWidth={1} />
            <text x={17.5} y={y + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={active ? '#0b1222' : '#a99a6a'}>
              D{Number(d.id)}
            </text>
          </g>
        );
      })}
      {/* top line and cross aisle labels */}
      <line x1={MAP.doorX} y1={MAP.topLineY} x2={MAP.w - 8} y2={MAP.topLineY} stroke="#2a3654" strokeWidth={2} />
      {[34, 75].map((vt) => (
        <text key={vt} x={vtX(vt)} y={15} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing={1} fill={colors.amber}>
          CROSS AISLE · LỐI NGANG
        </text>
      ))}
      {dashX.map((x) => (
        <line key={x} x1={x} y1={MAP.topLineY + 6} x2={x} y2={MAP.h - 6} stroke={colors.amber} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="7 7" />
      ))}
      {rows}
    </g>
  );
});
