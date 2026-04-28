import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
  ResponsiveContainer,
} from 'recharts';

import { useStore, CATEGORY_COLORS } from '../store/useStore';
import * as api from '../api/index';

/* ─────────────────────────────────────────────
   StatCard
───────────────────────────────────────────── */
function StatCard({ value, label, icon }) {
  return (
    <div className="card stat-card">
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LoadingSkeleton
───────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <>
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton card" style={{ height: 110, borderRadius: 'var(--block-radius)' }} />
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {[1, 2].map((i) => (
          <div key={i} className="skeleton card" style={{ height: 320, borderRadius: 'var(--block-radius)' }} />
        ))}
      </div>
      <div className="skeleton card" style={{ height: 320, borderRadius: 'var(--block-radius)' }} />
    </>
  );
}

/* ─────────────────────────────────────────────
   ErrorState
───────────────────────────────────────────── */
function ErrorState({ message, onRetry }) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '1rem',
        padding:        '4rem 2rem',
        textAlign:      'center',
      }}
    >
      <AlertCircle size={40} style={{ color: 'var(--danger, #EF4444)', opacity: 0.8 }} />
      <p style={{ color: 'var(--text-secondary)', maxWidth: 360 }}>{message}</p>
      <button className="btn btn-secondary" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Custom Pie Tooltip
───────────────────────────────────────────── */
function PieCustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const hours = Math.round((value / 60) * 10) / 10;
  return (
    <div
      style={{
        background:   'var(--card-bg, #1E293B)',
        border:       '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 8,
        padding:      '0.5rem 0.75rem',
        fontSize:     '0.85rem',
      }}
    >
      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{name}</span>
      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>{hours}h</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LifeAreaPie
───────────────────────────────────────────── */
function LifeAreaPie({ data }) {
  const chartData = Object.entries(data || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#6B7280',
    }));

  if (!chartData.length) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        No data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <PieTooltip content={<PieCustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   Completion Rate Custom Tooltip
───────────────────────────────────────────── */
function CompletionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background:   'var(--card-bg, #1E293B)',
        border:       '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 8,
        padding:      '0.5rem 0.75rem',
        fontSize:     '0.85rem',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{Math.round(payload[0].value * 100)}%</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CompletionChart
───────────────────────────────────────────── */
function CompletionChart({ data }) {
  if (!data.length) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        No data for this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'MMM d'),
  }));

  const tickInterval = data.length > 14 ? 1 : 0; // every 2nd when interval=1

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          interval={tickInterval}
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <LineTooltip content={<CompletionTooltip />} />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#3B82F6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   MoodEnergy Custom Tooltip
───────────────────────────────────────────── */
function MoodEnergyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background:   'var(--card-bg, #1E293B)',
        border:       '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: 8,
        padding:      '0.5rem 0.75rem',
        fontSize:     '0.85rem',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.stroke, fontWeight: 600 }}>
          {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MoodEnergyChart
───────────────────────────────────────────── */
function MoodEnergyChart({ data }) {
  if (!data.length) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        No data for this period
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: 'var(--text-secondary, #94A3B8)' }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <LineTooltip content={<MoodEnergyTooltip />} />
        <Legend
          verticalAlign="bottom"
          formatter={(value) => (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {value}
            </span>
          )}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#F59E0B' }}
        />
        <Line
          type="monotone"
          dataKey="energy"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#3B82F6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────────── */
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
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ── Derived summary values ───────────────── */
  const totalMinutes = Object.values(stats?.timeByCategory || {}).reduce((a, b) => a + b, 0);
  const totalHours   = `${Math.round(totalMinutes / 60)}h`;

  const completionRates = stats?.completionRates || [];
  const avgCompletion   = completionRates.length
    ? `${Math.round(
        (completionRates.reduce((a, b) => a + b.rate, 0) / completionRates.length) * 100
      )}%`
    : '–';

  const moodTrend = stats?.moodTrend || [];
  const avgMood   = moodTrend.length
    ? (moodTrend.reduce((a, b) => a + b.mood, 0) / moodTrend.length).toFixed(1)
    : '–';

  return (
    <div className="page page-transition">
      {/* ── Header ── */}
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h1 className="section-title">Dashboard</h1>

        <div className="tab-group">
          {['week', 'month', 'year'].map((r) => (
            <button
              key={r}
              className={`tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
              style={{ textTransform: 'capitalize' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <LoadingSkeleton />}

      {/* ── Error ── */}
      {error && !loading && <ErrorState message={error} onRetry={fetchStats} />}

      {/* ── Content ── */}
      {stats && !loading && (
        <>
          {/* Row 1: Stat cards */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <StatCard value={stats.totalDaysTracked} label="Days Tracked" icon="📅" />
            <StatCard value={totalHours}             label="Total Hours"  icon="⏱️" />
            <StatCard value={avgCompletion}          label="Avg Completion" icon="✅" />
            <StatCard value={avgMood}                label="Avg Mood"     icon="😊" />
          </div>

          {/* Row 2: Pie + Completion line */}
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontFamily: 'DM Serif Display', marginBottom: '1rem' }}>Time by Life Area</h3>
              <LifeAreaPie data={stats.timeByCategory} />
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'DM Serif Display', marginBottom: '1rem' }}>Completion Rate</h3>
              <CompletionChart data={completionRates} />
            </div>
          </div>

          {/* Row 3: Mood & Energy */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'DM Serif Display', marginBottom: '1rem' }}>Mood & Energy Trend</h3>
            <MoodEnergyChart data={moodTrend} />
          </div>
        </>
      )}
    </div>
  );
}
