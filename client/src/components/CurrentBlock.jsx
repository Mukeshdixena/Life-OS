import { Clock } from 'lucide-react';
import { format } from 'date-fns';

function formatCountdown(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours        = Math.floor(totalSeconds / 3600);
  const minutes      = Math.floor((totalSeconds % 3600) / 60);
  const seconds      = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export default function CurrentBlock({ block, now, onComplete, onNeedMore }) {
  if (!block) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Clock size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <p>No active block right now</p>
      </div>
    );
  }

  const timeLeft      = Math.max(0, new Date(block.end_time) - now);
  const totalDuration = new Date(block.end_time) - new Date(block.start_time);
  const elapsed       = totalDuration - timeLeft;
  const progress      = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  const timerColor =
    timeLeft < 5 * 60 * 1000  ? '#EF4444' :
    timeLeft < 15 * 60 * 1000 ? '#F97316' :
                                 '#22C55E';

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   '1rem',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily:   'DM Serif Display',
              fontSize:     '1.5rem',
              marginBottom: '0.4rem',
            }}
          >
            {block.title}
          </h2>
          <span
            className="badge"
            style={{ background: `${block.color}25`, color: block.color }}
          >
            {block.category}
          </span>
        </div>
        {block.is_non_negotiable && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Non-negotiable
          </span>
        )}
      </div>

      {/* Countdown */}
      <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
        <div
          style={{
            fontFamily: 'DM Serif Display',
            fontSize:   '3rem',
            color:      timerColor,
            lineHeight: 1,
          }}
        >
          {formatCountdown(timeLeft)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          remaining
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height:       6,
          background:   'var(--bg-tertiary)',
          borderRadius: 3,
          overflow:     'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            height:     '100%',
            width:      `${progress}%`,
            background: timerColor,
            borderRadius: 3,
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={onComplete}
        >
          ✅ Complete Early
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={onNeedMore}
        >
          ⏳ Need More Time
        </button>
      </div>
    </div>
  );
}
