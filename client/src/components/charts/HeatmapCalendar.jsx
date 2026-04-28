const CELL_SIZE = 14;
const GAP = 2;
const STEP = CELL_SIZE + GAP;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];

function cellColor(rate) {
  if (rate == null) return 'var(--bg-tertiary)';
  if (rate === 0) return '#374151';
  if (rate < 0.5) return '#B45309';
  if (rate < 0.8) return '#D97706';
  return '#22C55E';
}

function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function HeatmapCalendar({ data, weeks = 12 }) {
  const today = new Date();

  // Generate days: last `weeks * 7` days, oldest first
  const days = [];
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  // Map data by ISO date string (YYYY-MM-DD)
  const dataMap = {};
  (data || []).forEach(d => {
    const key = d.date?.split('T')[0];
    if (key) dataMap[key] = d.rate;
  });

  // Group into columns of 7 (each column = one week, Mon–Sun)
  const columns = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  const DAY_LABEL_WIDTH = 20;
  const MONTH_LABEL_HEIGHT = 20;

  const svgWidth = DAY_LABEL_WIDTH + columns.length * STEP;
  const svgHeight = MONTH_LABEL_HEIGHT + 7 * STEP;

  // Compute month labels: show month name above the first column where that month starts
  const monthLabels = [];
  let lastMonth = -1;
  columns.forEach((col, colIdx) => {
    const firstDay = col[0];
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ colIdx, label: MONTH_NAMES[month] });
      lastMonth = month;
    }
  });

  return (
    <div>
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
        >
          {/* Month labels */}
          {monthLabels.map(({ colIdx, label }) => (
            <text
              key={`month-${colIdx}`}
              x={DAY_LABEL_WIDTH + colIdx * STEP}
              y={12}
              fontSize={10}
              fill="var(--text-muted)"
            >
              {label}
            </text>
          ))}

          {/* Day-of-week labels: M, W, F only (rows 0, 2, 4) */}
          {DAY_LABELS.map((label, rowIdx) => (
            label ? (
              <text
                key={`day-${rowIdx}`}
                x={0}
                y={MONTH_LABEL_HEIGHT + rowIdx * STEP + CELL_SIZE - 2}
                fontSize={9}
                fill="var(--text-muted)"
              >
                {label}
              </text>
            ) : null
          ))}

          {/* Cells */}
          {columns.map((col, colIdx) =>
            col.map((date, rowIdx) => {
              const dateStr = toLocalDateString(date);
              const rate = dataMap[dateStr];
              const hasData = rate != null;
              const x = DAY_LABEL_WIDTH + colIdx * STEP;
              const y = MONTH_LABEL_HEIGHT + rowIdx * STEP;
              const isToday = dateStr === toLocalDateString(today);
              const tooltipText = hasData
                ? `${dateStr}: ${Math.round(rate * 100)}% completion`
                : `${dateStr}: No data`;

              return (
                <rect
                  key={dateStr}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={3}
                  fill={hasData ? cellColor(rate) : 'var(--bg-tertiary)'}
                  stroke={isToday ? '#F59E0B' : 'none'}
                  strokeWidth={isToday ? 1.5 : 0}
                  style={{ cursor: 'default' }}
                >
                  <title>{tooltipText}</title>
                </rect>
              );
            })
          )}
        </svg>
      </div>

      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
        <span>Less</span>
        {['#374151', '#B45309', '#D97706', '#22C55E'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
