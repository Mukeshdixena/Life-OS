import { useState, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, subMonths, addMonths, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useStore, CATEGORY_COLORS } from '../store/useStore';
import * as api from '../api/index';

const CAT_HEX = CATEGORY_COLORS;
function catHex(c) { return CAT_HEX[c] || '#6B7280'; }

/* ── Mini ring ──────────────────────────────────────────────── */
function Ring({ pct, size = 22, stroke = 2.5, color = 'var(--accent)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

/* ── CalCell ────────────────────────────────────────────────── */
function CalCell({ day, histItem, isSelected, isToday, isFuture, onSelect }) {
  const pct  = histItem ? Math.round((histItem.completion_rate || 0) * 100) : null;
  const color = pct == null ? 'var(--border)' : pct >= 80 ? '#22C55E' : pct >= 50 ? 'var(--accent)' : '#E5A93A';
  const cls = `cal-cell${isToday ? ' today' : ''}${isFuture ? ' future' : ''}${isSelected ? ' selected' : ''}${!histItem && !isToday ? ' muted' : ''}`;

  return (
    <div className={cls} onClick={() => !isFuture && histItem && onSelect(format(day, 'yyyy-MM-dd'))}>
      <div className="cal-row1">
        <span className="cal-num">{format(day, 'd')}</span>
        {histItem && !isFuture && <Ring pct={pct || 0} size={20} stroke={2.5} color={color} />}
      </div>
      {histItem && !isFuture && (
        <div className="cal-dots">
          {['work','health','personal'].map((c, j) => (
            <span key={j} style={{ background: catHex(c) }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── DayDetail ──────────────────────────────────────────────── */
function DayDetail({ date, detail, loading }) {
  if (loading) {
    return (
      <div className="day-detail">
        <div className="skeleton" style={{ width: 100, height: 12, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 200, height: 28, marginBottom: 18 }} />
        <div className="dd-stats">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
        </div>
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      </div>
    );
  }

  if (!detail?.plan) {
    return (
      <div className="day-detail" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-2)' }}>
        <span style={{ fontSize: 32, marginBottom: 12 }}>📅</span>
        <p style={{ textAlign: 'center', fontSize: 13 }}>No plan found for this day.</p>
      </div>
    );
  }

  const { plan, blocks = [], checkins = [] } = detail;
  const done  = checkins.filter(c => c.outcome === 'done').length;
  const total = blocks.length;
  const comp  = total > 0 ? Math.round((done / total) * 100) : 0;
  const label = format(parseISO(date), 'EEEE, MMMM d');

  return (
    <div className="day-detail">
      <div className="label-eyebrow">{isSameDay(parseISO(date), new Date()) ? 'In progress' : 'Logged'}</div>
      <h2>{label}</h2>

      <div className="dd-stats">
        <div className="dd-stat">
          <div className="lbl">Planned</div>
          <div className="val">{total} blocks</div>
        </div>
        <div className="dd-stat">
          <div className="lbl">Completion</div>
          <div className="val">{comp}%</div>
        </div>
        <div className="dd-stat">
          <div className="lbl">Mood</div>
          <div className="val">{plan.mood_score || '–'} / 5</div>
        </div>
        <div className="dd-stat">
          <div className="lbl">Energy</div>
          <div className="val">{plan.energy_score || '–'} / 5</div>
        </div>
      </div>

      <div className="label-eyebrow" style={{ marginBottom: 8 }}>Mini timeline</div>
      <div className="mini-tl">
        {blocks.map(b => {
          const c = b.color || catHex(b.category);
          const checkin = checkins.find(ch => ch.block_id === b.id);
          return (
            <div key={b.id} className="mini-row" style={{ '--cat': c }}>
              <span className="t">{format(new Date(b.start_time), 'h:mm a')}</span>
              <span className="nm">{b.title}</span>
              {checkin?.outcome === 'done'
                ? <Check size={12} color="var(--cat-health)" strokeWidth={3} />
                : <span style={{ width: 12 }} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div className="gauge">
          <span className="lbl">Mood</span>
          <svg viewBox="0 0 60 30">
            <path d="M5 25 A 25 25 0 0 1 55 25" fill="none" stroke="var(--border)" strokeWidth="3" />
            <path d="M5 25 A 25 25 0 0 1 45 8" fill="none" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
            <circle cx="45" cy="8" r="3" fill="#F97316" />
          </svg>
        </div>
        <div className="gauge">
          <span className="lbl">Energy</span>
          <svg viewBox="0 0 60 30">
            <path d="M5 25 A 25 25 0 0 1 55 25" fill="none" stroke="var(--border)" strokeWidth="3" />
            <path d="M5 25 A 25 25 0 0 1 50 12" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="12" r="3" fill="#3B82F6" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── History Page ───────────────────────────────────────────── */
export default function History() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [history,      setHistory]      = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [dayDetail,    setDayDetail]    = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { fetchHistory(); }, []); // eslint-disable-line
  useEffect(() => {
    if (selected) fetchDayDetail(selected);
    else setDayDetail(null);
  }, [selected]); // eslint-disable-line

  async function fetchHistory() {
    try {
      const { data } = await api.dashboard.getHistory(1);
      setHistory(data.days || []);
    } catch {}
  }
  async function fetchDayDetail(date) {
    setLoadingDetail(true);
    setDayDetail(null);
    try {
      const { data } = await api.dashboard.getDayDetail(date);
      setDayDetail(data);
    } catch {} finally {
      setLoadingDetail(false);
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const startPad   = getDay(monthStart); // 0=Sun
  const calDays    = [];
  for (let i = 0; i < startPad; i++) calDays.push(null);
  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(d => calDays.push(d));
  while (calDays.length % 7 !== 0) calDays.push(null);

  return (
    <div className="page-fade">
      <div className="dash-head">
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Past days</div>
          <h1>History</h1>
        </div>
      </div>

      <div className="hist-grid">
        <div>
          <div className="cal-head">
            <h2>{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="cal-nav">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="cal-grid">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} className="cal-day-h">{d}</div>
            ))}
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr  = format(day, 'yyyy-MM-dd');
              const histItem = history.find(h => h.date === dateStr || h.date?.startsWith(dateStr));
              return (
                <CalCell
                  key={i}
                  day={day}
                  histItem={histItem}
                  isSelected={selected === dateStr}
                  isToday={isSameDay(day, new Date())}
                  isFuture={day > new Date()}
                  onSelect={setSelected}
                />
              );
            })}
          </div>
        </div>

        <div>
          {selected
            ? <DayDetail date={selected} detail={dayDetail} loading={loadingDetail} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-2)', gap: 12 }}>
                <span style={{ fontSize: 36 }}>📅</span>
                <p style={{ textAlign: 'center', fontSize: 13 }}>Click a day to see its details.</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
