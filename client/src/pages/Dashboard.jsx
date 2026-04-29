import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { AlertCircle, RefreshCw, Flame, CheckSquare, Hourglass, Trophy } from 'lucide-react';
import { useStore, CATEGORY_COLORS } from '../store/useStore';
import * as api from '../api/index';

/* ── Helpers ────────────────────────────────────────────────── */
const CAT_NAMES = {
  work: 'Deep Work', health: 'Health', learning: 'Learning',
  relationships: 'People', admin: 'Admin', personal: 'Personal', sleep: 'Rest',
};
function catName(k) { return CAT_NAMES[k] || k; }
function catHex(k)  { return CATEGORY_COLORS[k] || '#6B7280'; }

/* ── StatCard ───────────────────────────────────────────────── */
function StatCard({ Icon, label, num, trend, down }) {
  return (
    <div className="stat-card">
      <div className="sc-ic"><Icon size={16} /></div>
      <div className="sc-label">{label}</div>
      <div className="sc-num">{num}</div>
      <div className={`sc-trend${down ? ' down' : ''}`}>{trend}</div>
    </div>
  );
}

/* ── PlannedVsActual bars ───────────────────────────────────── */
function PlannedActualChart({ data }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <div className="empty" style={{ padding: 20 }}>No data</div>;
  const maxH = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="bar-chart">
      {entries.map(([cat, mins]) => {
        const hex  = catHex(cat);
        const pA   = (mins / maxH) * 100;
        return (
          <div key={cat} className="bar-row">
            <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: hex, flexShrink: 0 }} />
              {catName(cat)}
            </div>
            <div className="bar-stack" style={{ '--cat': hex }}>
              <div className="bar-actual" style={{ width: `${pA}%` }} />
            </div>
            <div className="v">{Math.round(mins / 60 * 10) / 10}h</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut ──────────────────────────────────────────────────── */
function Donut({ data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
  if (!entries.length) return <div className="empty" style={{ padding: 20 }}>No data</div>;

  const totalMins = entries.reduce((s, [, v]) => s + v, 0);
  const totalH    = Math.round(totalMins / 60 * 10) / 10;
  const size = 160, stroke = 22;
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;

  let acc = 0;
  const arcs = entries.map(([cat, mins]) => {
    const start = (acc / totalMins) * Math.PI * 2 - Math.PI / 2;
    acc += mins;
    const end  = (acc / totalMins) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    return { cat, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, hex: catHex(cat), h: Math.round(mins / 60 * 10) / 10 };
  });

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill="none" stroke={a.hex} strokeWidth={stroke} strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 2} textAnchor="middle" fontFamily="DM Serif Display" fontSize="26" fill="var(--text-1)">{totalH}h</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="9" fill="var(--text-3)" letterSpacing="2">TRACKED</text>
      </svg>
      <div className="donut-legend">
        {arcs.map(a => (
          <div key={a.cat} className="legend-row" style={{ '--cat': a.hex }}>
            <span className="sw" />
            <span className="name">{catName(a.cat)}</span>
            <span className="v">{a.h}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Line chart ─────────────────────────────────────────────── */
function LineChart({ data, color = 'var(--accent)', valueKey = 'rate', maxVal = 100 }) {
  const W = 600, H = 180, pad = 12;
  if (!data.length) return <div className="empty" style={{ padding: 20 }}>No data</div>;

  const step = (W - pad * 2) / Math.max(1, data.length - 1);
  const pts  = data.map((d, i) => [
    pad + i * step,
    H - pad - ((d[valueKey] / maxVal)) * (H - pad * 2),
  ]);
  const path = pts.map((p, i, a) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const prev = a[i-1];
    const cx1  = prev[0] + (p[0] - prev[0]) / 2;
    const cy1  = prev[1];
    const cx2  = prev[0] + (p[0] - prev[0]) / 2;
    const cy2  = p[1];
    return `C ${cx1} ${cy1} ${cx2} ${cy2} ${p[0]} ${p[1]}`;
  }).join(' ');
  const area = `${path} L ${pts[pts.length-1][0]} ${H-pad} L ${pad} ${H-pad} Z`;

  return (
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map(g => (
          <line key={g} x1={pad} x2={W-pad}
            y1={H - pad - (g/100) * (H - pad*2)}
            y2={H - pad - (g/100) * (H - pad*2)}
            stroke="var(--border)" strokeWidth="1"
            strokeDasharray={g === 0 || g === 100 ? '' : '2 4'} />
        ))}
        <path d={area} fill="color-mix(in srgb, var(--accent) 8%, transparent)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg-2)" stroke={color} strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

/* ── Dual line (mood + energy) ──────────────────────────────── */
function DualLine({ data }) {
  const W = 600, H = 180, pad = 12;
  if (!data.length) return <div className="empty" style={{ padding: 20 }}>No data</div>;

  const step = (W - pad*2) / Math.max(1, data.length - 1);
  const norm = v => H - pad - (v / 5) * (H - pad*2);
  const mkPath = (key) => data.map((d, i) => {
    const x = pad + i * step, y = norm(d[key] || 0);
    if (i === 0) return `M ${x} ${y}`;
    const px = pad + (i-1) * step, py = norm(data[i-1][key] || 0);
    return `C ${px + step/2} ${py} ${x - step/2} ${y} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[1,2,3,4,5].map(g => (
          <line key={g} x1={pad} x2={W-pad} y1={norm(g)} y2={norm(g)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
        ))}
        <path d={mkPath('mood')}   fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <path d={mkPath('energy')} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={'m'+i} cx={pad+i*step} cy={norm(d.mood   || 0)} r="2.5" fill="#F97316" />
        ))}
        {data.map((d, i) => (
          <circle key={'e'+i} cx={pad+i*step} cy={norm(d.energy || 0)} r="2.5" fill="#3B82F6" />
        ))}
      </svg>
    </div>
  );
}

/* ── Heatmap (completion rates) ─────────────────────────────── */
function Heatmap({ data }) {
  const cells = data.slice(-364).map(d => Math.max(0, Math.min(1, d.rate || 0)));
  while (cells.length < 364) cells.unshift(0);

  return (
    <>
      <div className="hm-months">
        <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
        <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span>
      </div>
      <div className="heatmap-wrap">
        <div className="hm-day-labels">
          <span>M</span><span> </span><span>W</span><span> </span><span>F</span><span> </span><span> </span>
        </div>
        <div className="hm-grid">
          {cells.map((v, i) => (
            <div key={i} className="hm-cell" style={{ '--lvl': v }} title={`${Math.round(v*100)}%`} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Dashboard Page ─────────────────────────────────────────── */
export default function Dashboard() {
  const [range,   setRange]   = useState('week');
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard.getStats(range);
      setStats(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totalMins = Object.values(stats?.timeByCategory || {}).reduce((a, b) => a + b, 0);
  const totalH    = `${Math.round(totalMins / 60)}h`;
  const rates     = stats?.completionRates || [];
  const avgComp   = rates.length
    ? `${Math.round(rates.reduce((a, b) => a + b.rate, 0) / rates.length * 100)}%`
    : '–';
  const moodData  = stats?.moodTrend || [];
  const avgMood   = moodData.length
    ? (moodData.reduce((a, b) => a + (b.mood || 0), 0) / moodData.length).toFixed(1)
    : '–';

  return (
    <div className="page-fade">
      {/* Header */}
      <div className="dash-head">
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Insights</div>
          <h1>Your Life Dashboard</h1>
        </div>
        <div className="range-pills">
          {['week', 'month', 'year'].map(r => (
            <button key={r} className={`range-pill${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
          </div>
          <div className="skeleton" style={{ height: 300, borderRadius: 12, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
        </>
      )}

      {error && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '4rem 2rem' }}>
          <AlertCircle size={40} color="#E0524A" />
          <p style={{ color: 'var(--text-2)', maxWidth: 360, textAlign: 'center' }}>{error}</p>
          <button className="btn btn-outline" onClick={fetchStats} style={{ display: 'flex', gap: 8 }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {stats && !loading && (
        <>
          {/* Stat cards */}
          <div className="stat-grid">
            <StatCard Icon={Flame}       label="Days tracked"    num={stats.totalDaysTracked || '–'} trend="this period" />
            <StatCard Icon={Hourglass}   label="Hours tracked"   num={totalH}                        trend="logged" />
            <StatCard Icon={CheckSquare} label="Avg completion"  num={avgComp}                       trend="of blocks" />
            <StatCard Icon={Trophy}      label="Avg mood"        num={avgMood}                       trend="out of 5" />
          </div>

          {/* Row 1: bars + donut */}
          <div className="dash-row r1">
            <div className="dash-card">
              <h3>Time by life area</h3>
              <div className="sub-h">Where the hours went · {range}</div>
              <PlannedActualChart data={stats.timeByCategory} />
            </div>
            <div className="dash-card">
              <h3>Life area breakdown</h3>
              <div className="sub-h">Total tracked hours</div>
              <Donut data={stats.timeByCategory} />
            </div>
          </div>

          {/* Row 2: completion + mood */}
          <div className="dash-row r2">
            <div className="dash-card">
              <h3>Completion rate</h3>
              <div className="sub-h">Last {rates.length} days</div>
              <LineChart data={rates} valueKey="rate" maxVal={1} color="var(--accent)" />
            </div>
            <div className="dash-card">
              <h3>Mood & energy</h3>
              <div className="sub-h">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 14 }}>
                  <span style={{ width: 10, height: 2, background: '#F97316', borderRadius: 2 }} />Mood
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 2, background: '#3B82F6', borderRadius: 2 }} />Energy
                </span>
              </div>
              <DualLine data={moodData} />
            </div>
          </div>

          {/* Heatmap */}
          {rates.length > 0 && (
            <div className="dash-card" style={{ marginBottom: 16 }}>
              <h3>Activity heatmap</h3>
              <div className="sub-h">Last 52 weeks · color intensity = completion rate</div>
              <Heatmap data={rates} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
