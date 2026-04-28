import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  subMonths,
  addMonths,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, CATEGORY_COLORS } from '../store/useStore';
import * as api from '../api/index';

/* ── DayCell ─────────────────────────────────────────────── */
function DayCell({ day, history, selectedDate, onSelect }) {
  if (!day) return <div />;

  const dateStr = format(day, 'yyyy-MM-dd');
  const historyItem = history.find(
    (h) => h.date === dateStr || h.date?.startsWith(dateStr)
  );
  const isSelected = selectedDate === dateStr;
  const isToday = isSameDay(day, new Date());
  const rate = historyItem?.completion_rate ?? null;
  const hasPlan = historyItem != null;

  const ringColor =
    rate == null
      ? 'var(--border)'
      : rate >= 0.8
      ? '#22C55E'
      : rate >= 0.5
      ? '#F59E0B'
      : '#EF4444';

  return (
    <div
      onClick={() => hasPlan && onSelect(dateStr)}
      style={{
        aspectRatio: '1',
        borderRadius: 10,
        padding: '0.4rem',
        border: '1.5px solid',
        borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--accent)' : 'var(--border)',
        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        cursor: hasPlan ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem',
        transition: '200ms',
        opacity: !hasPlan && !isToday ? 0.4 : 1,
      }}
    >
      <span
        style={{
          fontSize: '0.8rem',
          fontWeight: isToday ? 700 : 400,
          color: isToday ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {format(day, 'd')}
      </span>

      {hasPlan && (
        <div style={{ width: 20, height: 20, position: 'relative' }}>
          <svg
            viewBox="0 0 20 20"
            style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke="var(--border)"
              strokeWidth="2.5"
            />
            <circle
              cx="10"
              cy="10"
              r="7"
              fill="none"
              stroke={ringColor}
              strokeWidth="2.5"
              strokeDasharray={`${(rate ?? 0) * 43.98} 43.98`}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ── DayDetail ───────────────────────────────────────────── */
function DayDetail({ date, detail, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <div
          className="skeleton"
          style={{ height: 24, width: 200, marginBottom: '1rem', borderRadius: 6 }}
        />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 60, marginBottom: '0.75rem', borderRadius: 10 }}
          />
        ))}
      </div>
    );
  }

  if (!detail?.plan) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <p>No plan found for this day</p>
      </div>
    );
  }

  const { plan, blocks, checkins } = detail;
  const totalBlocks = blocks.length;
  const doneBlocks = checkins?.filter((c) => c.outcome === 'done').length || 0;
  const rate = totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0;

  return (
    <div>
      <h2 style={{ fontFamily: 'DM Serif Display', marginBottom: '0.5rem' }}>
        {format(parseISO(date), 'MMMM d, yyyy')}
      </h2>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, padding: '0.875rem', textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: '1.5rem', fontFamily: 'DM Serif Display' }}>{rate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completion</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '0.875rem', textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: '1.5rem', fontFamily: 'DM Serif Display' }}>{plan.mood_score || '–'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mood</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '0.875rem', textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: '1.5rem', fontFamily: 'DM Serif Display' }}>{plan.energy_score || '–'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Energy</div>
        </div>
      </div>

      {/* Blocks list */}
      <h4
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.75rem',
        }}
      >
        Timeline
      </h4>
      <div>
        {blocks.map((block) => {
          const checkin = checkins?.find((c) => c.block_id === block.id);
          return (
            <div
              key={block.id}
              className="card"
              style={{
                marginBottom: '0.5rem',
                padding: '0.75rem',
                borderLeft: `3px solid ${block.color || '#6B7280'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{block.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {format(new Date(block.start_time), 'h:mm')}–{format(new Date(block.end_time), 'h:mm a')}
                  </div>
                </div>
                {checkin && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 10,
                      background:
                        checkin.outcome === 'done' ? '#22C55E25' : 'var(--bg-tertiary)',
                      color:
                        checkin.outcome === 'done' ? '#22C55E' : 'var(--text-muted)',
                    }}
                  >
                    {checkin.outcome === 'done'
                      ? '✓ Done'
                      : checkin.outcome === 'skipped'
                      ? 'Skipped'
                      : checkin.outcome}
                  </span>
                )}
              </div>
              {checkin?.notes && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.4rem',
                    fontStyle: 'italic',
                  }}
                >
                  {checkin.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── EmptyState ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)',
        gap: '1rem',
        padding: '2rem',
      }}
    >
      <span style={{ fontSize: '3rem' }}>📅</span>
      <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        Click on a day to see your schedule and check-in details.
      </p>
    </div>
  );
}

/* ── History (main page) ─────────────────────────────────── */
export default function History() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* Fetch history on mount */
  useEffect(() => {
    fetchHistory();
  }, []);

  /* Fetch day detail whenever selectedDate changes */
  useEffect(() => {
    if (selectedDate) {
      fetchDayDetail(selectedDate);
    } else {
      setDayDetail(null);
    }
  }, [selectedDate]);

  async function fetchHistory() {
    try {
      const { data } = await api.dashboard.getHistory(1);
      setHistory(data.days || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }

  async function fetchDayDetail(date) {
    setLoadingDetail(true);
    setDayDetail(null);
    try {
      const { data } = await api.dashboard.getDayDetail(date);
      setDayDetail(data);
    } catch (err) {
      console.error('Failed to fetch day detail:', err);
      setDayDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  /* Build calendar days array */
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startPad = getDay(monthStart);
  const calendarDays = [];

  for (let i = 0; i < startPad; i++) calendarDays.push(null);
  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach((d) =>
    calendarDays.push(d)
  );
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div
      className="page page-transition"
      style={{
        display: 'flex',
        gap: '1.5rem',
        height: 'calc(100vh - 4rem)',
        overflow: 'hidden',
      }}
    >
      {/* Left: Calendar */}
      <div style={{ flex: '0 0 65%', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h1 className="section-title" style={{ margin: 0 }}>
            History
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span
              style={{
                fontFamily: 'DM Serif Display',
                fontSize: '1.1rem',
                minWidth: 140,
                textAlign: 'center',
              }}
            >
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.25rem',
            marginBottom: '0.5rem',
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                padding: '0.25rem',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0.25rem',
          }}
        >
          {calendarDays.map((day, i) => (
            <DayCell
              key={i}
              day={day}
              history={history}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          ))}
        </div>
      </div>

      {/* Right: Day detail panel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedDate ? (
          <DayDetail
            date={selectedDate}
            detail={dayDetail}
            loading={loadingDetail}
            CATEGORY_COLORS={CATEGORY_COLORS}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
