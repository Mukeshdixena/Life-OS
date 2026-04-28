import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS = {
  work: '#3B82F6',
  health: '#22C55E',
  learning: '#A855F7',
  relationships: '#F97316',
  admin: '#6B7280',
  personal: '#EC4899',
  sleep: '#1E293B',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{name}</div>
      <div style={{ color: 'var(--text-muted)' }}>{Math.round(value / 60 * 10) / 10}h ({value} min)</div>
    </div>
  );
}

export default function LifeAreaPie({ data }) {
  const pieData = Object.entries(data || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#6B7280' }));

  if (pieData.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No time data for this period
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
        {pieData.map(entry => (
          <div
            key={entry.name}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <span style={{ textTransform: 'capitalize' }}>{entry.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>({Math.round(entry.value / 60 * 10) / 10}h)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
