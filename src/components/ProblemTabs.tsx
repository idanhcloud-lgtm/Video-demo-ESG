import {colors} from '../theme';

export const PROBLEMS = [
  {en: 'Nearby bins not grouped', vi: 'Không gom vị trí gần nhau'},
  {en: 'Cross aisles not optimally utilized', vi: 'Lối ngang chưa được sử dụng tối ưu'},
  {en: 'Scattered items', vi: 'Hàng rải rác nhiều dãy'},
  {en: 'Morning congestion', vi: 'Ùn tắc đầu buổi sáng'},
];

/** Top bar with the 4 problems; `active` is 1-based, `solved` lists solved problem numbers. */
export const ProblemTabs: React.FC<{active: number; solved: number[]; activeSolved?: number}> = ({
  active,
  solved,
  activeSolved = 0,
}) => (
  <div style={{display: 'flex', gap: 16, padding: '0 48px'}}>
    {PROBLEMS.map((p, i) => {
      const n = i + 1;
      const isActive = n === active;
      const isSolved = solved.includes(n) || (isActive && activeSolved > 0.5);
      return (
        <div
          key={n}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 18px',
            borderRadius: 12,
            background: isActive ? '#f4f6fa' : colors.panel,
            border: `1px solid ${isActive ? '#ffffff' : '#1f2a40'}`,
            color: isActive ? '#0b1220' : colors.text,
            opacity: isActive ? 1 : 0.55,
            position: 'relative',
          }}
        >
          <div style={{fontSize: 34, fontWeight: 800, opacity: isActive ? 1 : 0.6}}>
            {String(n).padStart(2, '0')}
          </div>
          <div>
            <div style={{fontSize: 21, fontWeight: 700, lineHeight: 1.2}}>{p.en}</div>
            <div style={{fontSize: 16, opacity: 0.7}}>{p.vi}</div>
          </div>
          {isSolved ? (
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: 10,
                width: 30,
                height: 30,
                borderRadius: 15,
                background: isActive ? '#0b1220' : colors.green,
                color: isActive ? '#fff' : '#0b1220',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                transform: `scale(${isActive ? activeSolved : 1})`,
              }}
            >
              ✓
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);
