import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { useStore } from '../store/useStore';
import { useLiveClock } from '../hooks/useLiveClock';
import CurrentBlock from '../components/CurrentBlock';
import * as api from '../api/index';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const PX_PER_MIN = 2; // 120 px per hour

/* ─────────────────────────────────────────────
   Skeleton placeholders shown while loading
───────────────────────────────────────────── */
function TimelineSkeleton() {
  const heights = [90, 60, 120, 45, 90];
  const tops    = [0, 100, 170, 300, 355];
  return (
    <div style={{ position: 'relative', height: 480, paddingLeft: 80 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            position:     'absolute',
            left:         80,
            right:        12,
            top:          tops[i],
            height:       h,
            borderRadius: 'var(--block-radius)',
          }}
        />
      ))}
    </div>
  );
}

function RightPanelSkeleton() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="skeleton" style={{ width: 180, height: 20, marginBottom: '1rem', borderRadius: 6 }} />
      <div className="skeleton card" style={{ height: 220, marginBottom: '1.5rem' }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--block-radius)', marginBottom: '0.5rem' }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function Today() {
  const navigate = useNavigate();
  const { now }  = useLiveClock();

  /* Store */
  const todayPlan        = useStore((s) => s.todayPlan);
  const setTodayPlan     = useStore((s) => s.setTodayPlan);
  const triggerCheckin   = useStore((s) => s.triggerCheckin);
  const showCheckinModal = useStore((s) => s.showCheckinModal);

  /* Local state */
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);

  /* ── Fetch today's plan on mount ────────────── */
  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.plan.getToday();
      const data = res.data;

      if (!data || !data.plan) {
        navigate('/plan');
        return;
      }

      setTodayPlan(data.plan, data.blocks || []);
    } catch (err) {
      // 404 means no plan for today → redirect to /plan
      if (err?.response?.status === 404) {
        navigate('/plan');
      } else {
        setError(err?.response?.data?.error || err.message || 'Failed to load today\'s plan.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived blocks list ─────────────────────── */
  const blocks = todayPlan?.blocks || [];

  /* ── Active block ────────────────────────────── */
  const activeBlock = blocks.find((b) => {
    const start = new Date(b.start_time);
    const end   = new Date(b.end_time);
    return now >= start && now < end && b.status !== 'done' && b.status !== 'skipped';
  });

  /* ── Auto-trigger check-in when block ends ─────
     5-minute grace window after end_time.           */
  useEffect(() => {
    if (!blocks.length || showCheckinModal) return;

    const justEnded = blocks.find((b) => {
      const end   = new Date(b.end_time);
      const grace = new Date(end.getTime() + 5 * 60000);
      return (
        now >= end &&
        now <= grace &&
        (b.status === 'pending' || b.status === 'active')
      );
    });

    if (justEnded && !showCheckinModal) {
      triggerCheckin(justEnded);
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Timeline geometry ───────────────────────── */
  const dayStart =
    blocks.length > 0
      ? new Date(Math.min(...blocks.map((b) => new Date(b.start_time))))
      : (() => { const d = new Date(); d.setHours(6, 0, 0, 0); return d; })();

  const dayEnd =
    blocks.length > 0
      ? new Date(Math.max(...blocks.map((b) => new Date(b.end_time))))
      : (() => { const d = new Date(); d.setHours(23, 59, 59, 0); return d; })();

  const totalMinutes  = (dayEnd - dayStart) / 60000;
  const timelineHeight = totalMinutes * PX_PER_MIN;

  /* ── 30-minute time markers ──────────────────── */
  const timeMarkers = [];
  {
    const markerTime = new Date(dayStart);
    markerTime.setMinutes(Math.ceil(markerTime.getMinutes() / 30) * 30, 0, 0);
    while (markerTime <= dayEnd) {
      timeMarkers.push(new Date(markerTime));
      markerTime.setTime(markerTime.getTime() + 30 * 60000);
    }
  }

  /* ── Current-time indicator ──────────────────── */
  const nowTop      = ((now - dayStart) / 60000) * PX_PER_MIN;
  const isNowVisible = now >= dayStart && now <= dayEnd;

  /* ── Upcoming blocks (next 4, not done/skipped) ─ */
  const upcomingBlocks = blocks
    .filter((b) => new Date(b.start_time) > now && b.status !== 'done' && b.status !== 'skipped')
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 4);

  /* ── Loading ─────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left panel skeleton */}
        <div
          style={{
            width:       '60%',
            overflowY:   'auto',
            height:      '100vh',
            borderRight: '1px solid var(--border)',
            padding:     '1.5rem 0',
          }}
        >
          <TimelineSkeleton />
        </div>
        {/* Right panel skeleton */}
        <div style={{ width: '40%', overflowY: 'auto', height: '100vh' }}>
          <RightPanelSkeleton />
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────── */
  if (error) {
    return (
      <div
        style={{
          display:        'flex',
          height:         '100vh',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:            '1rem',
          padding:        '2rem',
        }}
      >
        <AlertCircle size={40} color="#EF4444" />
        <p style={{ color: 'var(--text-primary)', fontSize: '1rem', textAlign: 'center', maxWidth: 360 }}>
          {error}
        </p>
        <button className="btn btn-primary" onClick={loadPlan} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ════════════════════════════════════════
          LEFT PANEL — Timeline
          ════════════════════════════════════════ */}
      <div
        style={{
          width:       '60%',
          overflowY:   'auto',
          height:      '100vh',
          borderRight: '1px solid var(--border)',
          padding:     '1.5rem 0',
        }}
      >
        {/* Panel heading */}
        <div style={{ paddingLeft: 80, paddingRight: 12, marginBottom: '1rem' }}>
          <h3
            style={{
              fontFamily: 'DM Serif Display',
              fontSize:   '1.1rem',
              color:      'var(--text-muted)',
            }}
          >
            Timeline
          </h3>
        </div>

        {/* Scrollable timeline canvas */}
        <div style={{ position: 'relative', height: timelineHeight + 80, paddingLeft: 80 }}>

          {/* ── Time markers ─────────────────────── */}
          {timeMarkers.map((t) => {
            const top = ((t - dayStart) / 60000) * PX_PER_MIN;
            return (
              <div
                key={t.toISOString()}
                style={{
                  position:   'absolute',
                  top,
                  left:       0,
                  width:      '100%',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                }}
              >
                <span
                  style={{
                    fontSize:   '0.7rem',
                    color:      'var(--text-muted)',
                    width:      72,
                    textAlign:  'right',
                    flexShrink: 0,
                  }}
                >
                  {format(t, 'h:mm')}
                </span>
                <div
                  style={{
                    flex:       1,
                    height:     1,
                    background: 'var(--border)',
                    opacity:    0.5,
                  }}
                />
              </div>
            );
          })}

          {/* ── Blocks area ──────────────────────── */}
          <div style={{ position: 'absolute', top: 0, left: 80, right: 12, bottom: 0 }}>

            {blocks.map((block, i) => {
              const top    = ((new Date(block.start_time) - dayStart) / 60000) * PX_PER_MIN;
              const height = Math.max(
                ((new Date(block.end_time) - new Date(block.start_time)) / 60000) * PX_PER_MIN,
                30,
              );
              const isActive  = activeBlock?.id === block.id;
              const isPast    = new Date(block.end_time) < now;
              const isEditing = editingBlock?.id === block.id;

              return (
                <div
                  key={block.id}
                  onClick={() =>
                    setEditingBlock(isEditing ? null : block)
                  }
                  style={{
                    position:    'absolute',
                    left:        0,
                    right:       0,
                    top,
                    height,
                    borderRadius: 'var(--block-radius)',
                    borderLeft:  `3px solid ${block.color || '#6B7280'}`,
                    background:  isActive
                      ? `${block.color}22`
                      : isPast
                        ? 'var(--bg-tertiary)'
                        : `${block.color}15`,
                    padding:     '0.4rem 0.75rem',
                    cursor:      'pointer',
                    overflow:    'hidden',
                    transition:  '200ms',
                    boxShadow:   isActive
                      ? `0 0 0 2px ${block.color}, 0 4px 16px ${block.color}30`
                      : isEditing
                        ? `0 0 0 2px var(--accent)`
                        : 'none',
                    opacity:     isPast && !isActive ? 0.55 : 1,
                    animation:   `page-in ${200 + i * 30}ms ease-out`,
                  }}
                >
                  <div
                    style={{
                      display:        'flex',
                      justifyContent: 'space-between',
                      alignItems:     'flex-start',
                      gap:            4,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight:     500,
                          fontSize:       '0.82rem',
                          color:          'var(--text-primary)',
                          lineHeight:     1.3,
                          whiteSpace:     'nowrap',
                          overflow:       'hidden',
                          textOverflow:   'ellipsis',
                        }}
                      >
                        {block.title}
                      </div>
                      {height > 40 && (
                        <div
                          style={{
                            fontSize:  '0.72rem',
                            color:     'var(--text-muted)',
                            marginTop: 2,
                          }}
                        >
                          {format(new Date(block.start_time), 'h:mm')}
                          {'–'}
                          {format(new Date(block.end_time), 'h:mm a')}
                        </div>
                      )}
                    </div>

                    {/* Active pulse dot */}
                    {isActive && (
                      <div
                        style={{
                          width:        8,
                          height:       8,
                          borderRadius: '50%',
                          background:   block.color || 'var(--accent)',
                          flexShrink:   0,
                          marginTop:    3,
                        }}
                      />
                    )}

                    {/* Status badge for done/skipped */}
                    {!isActive && (block.status === 'done' || block.status === 'skipped') && (
                      <span
                        style={{
                          fontSize:    '0.65rem',
                          color:       block.status === 'done' ? '#22C55E' : 'var(--text-muted)',
                          flexShrink:  0,
                          marginTop:   2,
                          fontWeight:  600,
                        }}
                      >
                        {block.status === 'done' ? '✓' : '–'}
                      </span>
                    )}
                  </div>

                  {/* Category chip — only when tall enough */}
                  {height > 60 && (
                    <span
                      style={{
                        display:      'inline-block',
                        marginTop:    4,
                        padding:      '0.15rem 0.5rem',
                        borderRadius: 10,
                        fontSize:     '0.68rem',
                        background:   `${block.color}30`,
                        color:        block.color,
                        fontWeight:   500,
                      }}
                    >
                      {block.category}
                    </span>
                  )}

                  {/* Inline info when clicked / editing */}
                  {isEditing && height < 60 && (
                    <div
                      style={{
                        fontSize:  '0.7rem',
                        color:     'var(--text-muted)',
                        marginTop: 4,
                      }}
                    >
                      {format(new Date(block.start_time), 'h:mm')}
                      {' – '}
                      {format(new Date(block.end_time), 'h:mm a')}
                      {block.category ? ` · ${block.category}` : ''}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Current-time red line ─────────── */}
            {isNowVisible && (
              <div
                style={{
                  position:      'absolute',
                  left:          -80,
                  right:         0,
                  top:           nowTop,
                  pointerEvents: 'none',
                  zIndex:        10,
                }}
              >
                <div
                  style={{
                    position:   'absolute',
                    left:       0,
                    right:      0,
                    height:     2,
                    background: '#EF4444',
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position:     'absolute',
                      left:         -5,
                      top:          -4,
                      width:        10,
                      height:       10,
                      borderRadius: '50%',
                      background:   '#EF4444',
                    }}
                  />
                  {/* Time label */}
                  <span
                    style={{
                      position:   'absolute',
                      right:      4,
                      top:        -9,
                      fontSize:   '0.68rem',
                      color:      '#EF4444',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {format(now, 'h:mm a')}
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* end blocks area */}
        </div>
        {/* end timeline canvas */}
      </div>
      {/* end left panel */}

      {/* ════════════════════════════════════════
          RIGHT PANEL — Current block + upcoming
          ════════════════════════════════════════ */}
      <div
        style={{
          width:     '40%',
          padding:   '1.5rem',
          overflowY: 'auto',
          height:    '100vh',
        }}
      >
        {/* Date heading */}
        <h3
          style={{
            fontFamily:   'DM Serif Display',
            fontSize:     '1.1rem',
            marginBottom: '1rem',
            color:        'var(--text-muted)',
          }}
        >
          {format(now, 'EEEE, MMMM d')}
        </h3>

        {/* Current block card */}
        <CurrentBlock
          block={activeBlock}
          now={now}
          onComplete={() =>
            activeBlock &&
            triggerCheckin({ ...activeBlock, _quickDone: true })
          }
          onNeedMore={() => activeBlock && triggerCheckin(activeBlock)}
        />

        {/* Upcoming blocks */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4
            style={{
              fontSize:      '0.8rem',
              fontWeight:    600,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom:  '0.75rem',
            }}
          >
            Coming Up
          </h4>

          {upcomingBlocks.map((block) => (
            <div
              key={block.id}
              className="card"
              style={{
                marginBottom:   '0.5rem',
                padding:        '0.875rem',
                borderLeft:     `3px solid ${block.color || '#6B7280'}`,
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontWeight:   500,
                    fontSize:     '0.875rem',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {block.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {format(new Date(block.start_time), 'h:mm a')}
                </div>
              </div>
              <span
                style={{
                  padding:      '0.2rem 0.6rem',
                  borderRadius: 10,
                  fontSize:     '0.7rem',
                  background:   `${block.color || '#6B7280'}25`,
                  color:        block.color || 'var(--text-secondary)',
                  flexShrink:   0,
                  marginLeft:   '0.75rem',
                }}
              >
                {block.category}
              </span>
            </div>
          ))}

          {upcomingBlocks.length === 0 && (
            <p
              style={{
                color:     'var(--text-muted)',
                fontSize:  '0.875rem',
                textAlign: 'center',
                padding:   '1rem',
              }}
            >
              No more blocks today 🎉
            </p>
          )}
        </div>
        {/* end upcoming */}
      </div>
      {/* end right panel */}
    </div>
  );
}
