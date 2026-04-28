import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
        {format(parseISO(payload[0]?.payload?.date || new Date().toISOString()), 'MMM d')}
      </div>
      <div style={{ color: '#F59E0B' }}>Mood: {payload.find(p => p.dataKey === 'mood')?.value ?? '–'}/5</div>
      <div style={{ color: '#3B82F6' }}>Energy: {payload.find(p => p.dataKey === 'energy')?.value ?? '–'}/5</div>
    </div>
  );
}

export default function MoodTrend({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No mood data for this period
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={v => format(parseISO(v), 'MMM d')}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="energy"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 3, background: '#F59E0B', borderRadius: 2, marginRight: 6, verticalAlign: 'middle' }}></span>
          Mood
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 3, background: '#3B82F6', borderRadius: 2, marginRight: 6, verticalAlign: 'middle' }}></span>
          Energy
        </span>
      </div>
    </div>
  );
}
