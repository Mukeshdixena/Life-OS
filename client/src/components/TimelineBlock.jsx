import { format } from 'date-fns';

export default function TimelineBlock({
  block,
  index,
  dayStart,
  pxPerMin,
  isActive,
  isPast,
  onClick,
}) {
  const topMin    = (new Date(block.start_time) - dayStart) / 60000;
  const heightMin = (new Date(block.end_time) - new Date(block.start_time)) / 60000;
  const topPx     = topMin * pxPerMin;
  const heightPx  = Math.max(heightMin * pxPerMin, 30);

  return (
    <div
      onClick={onClick}
      className={`timeline-block ${isActive ? 'active' : ''}`}
      style={{
        top:             topPx,
        height:          heightPx,
        opacity:         isPast && !isActive ? 0.5 : 1,
        borderLeftColor: block.color || '#6B7280',
        backgroundColor: block.color ? `${block.color}18` : 'var(--bg-tertiary)',
        animation:       `page-in ${200 + index * 30}ms ease-out`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontWeight: 500,
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              lineHeight: 1.3,
            }}
          >
            {block.title}
          </div>

          {heightPx > 40 && (
            <div
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}
            >
              {format(new Date(block.start_time), 'h:mm')} –{' '}
              {format(new Date(block.end_time), 'h:mm a')}
            </div>
          )}
        </div>

        {isActive && (
          <div
            style={{
              width:       8,
              height:      8,
              borderRadius: '50%',
              background:  'var(--accent)',
              flexShrink:  0,
              marginTop:   4,
              animation:   'pulse-border 2s infinite',
            }}
          />
        )}
      </div>

      {heightPx > 60 && (
        <span
          className="badge"
          style={{
            marginTop:  '0.4rem',
            background: `${block.color}30`,
            color:      block.color,
            fontSize:   '0.7rem',
          }}
        >
          {block.category}
        </span>
      )}
    </div>
  );
}
