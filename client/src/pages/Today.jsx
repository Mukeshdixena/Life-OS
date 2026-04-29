import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, CheckCircle2, Play, Minus, Pencil, X, Check, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLiveClock } from '../hooks/useLiveClock';
import * as api from '../api/index';

/* ── Constants ─────────────────────────────────────────────── */
const PX_PER_HOUR = 76;
const TL_START_H  = 6;   // 6am
const TL_END_H    = 23;  // 11pm

function minFromMidnight(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}
function yFor(min) {
  return ((min - TL_START_H * 60) / 60) * PX_PER_HOUR;
}
function fmtMin(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')}${ap}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }

/* ── Category hex colors ────────────────────────────────────── */
const CAT_HEX = {
  work: '#3B82F6', health: '#22C55E', learning: '#A855F7',
  relationships: '#F97316', admin: '#6B7280', personal: '#EC4899', sleep: '#1E3A5F',
};
function catHex(c) { return CAT_HEX[c] || '#6B7280'; }

/* ── CountdownRing ─────────────────────────────────────────── */
function CountdownRing({ remaining, total, color }) {
  const size = 220, stroke = 10;
  const r = (size - stroke) / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(1, remaining / total));

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const isMajor = i % 5 === 0;
    const r1 = r - 12, r2 = isMajor ? r - 4 : r - 8;
    const cx  = size / 2 + Math.cos(angle) * r1;
    const cy  = size / 2 + Math.sin(angle) * r1;
    const cx2 = size / 2 + Math.cos(angle) * r2;
    const cy2 = size / 2 + Math.sin(angle) * r2;
    ticks.push(
      <line key={i} x1={cx} y1={cy} x2={cx2} y2={cy2}
        className="ring-tick" strokeWidth={isMajor ? 1.5 : 1} />
    );
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`}>
      {ticks}
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} className="ring-bg" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke}
        className="ring-fg" stroke={color}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" />
    </svg>
  );
}

/* ── NowPanel ──────────────────────────────────────────────── */
function NowPanel({ block, now, nextBlocks, onComplete }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!block) {
    return (
      <div className="now-panel">
        <div className="now-card" style={{ '--cat': '#6B7280' }}>
          <div className="now-header">
            <span className="now-eyebrow">Now</span>
            <h2>Between blocks</h2>
            <div className="muted" style={{ fontSize: 13 }}>No active block — take a breath.</div>
          </div>
        </div>
      </div>
    );
  }

  const hex       = block.color || catHex(block.category);
  const startMs   = new Date(block.start_time).getTime();
  const endMs     = new Date(block.end_time).getTime();
  const totalSec  = Math.max(1, (endMs - startMs) / 1000);
  const remSec    = Math.max(0, (endMs - now.getTime()) / 1000);
  const ratio     = remSec / totalSec;
  const elPct     = Math.min(100, ((totalSec - remSec) / totalSec) * 100);

  let ringColor = '#22C55E';
  if (ratio < 0.5) ringColor = '#E5A93A';
  if (ratio < 0.2) ringColor = '#E0524A';

  const hh = Math.floor(remSec / 3600);
  const mm = Math.floor((remSec % 3600) / 60);
  const ss = Math.floor(remSec % 60);
  const tt = hh > 0
    ? `${hh}:${pad2(mm)}:${pad2(ss)}`
    : `${pad2(mm)}:${pad2(ss)}`;

  return (
    <div className="now-panel">
      <div className="now-card" style={{ '--cat': hex }}>
        <div className="now-header">
          <span className="now-eyebrow">Now</span>
          <h2>{block.title}</h2>
          {block.category && (
            <span className="pill-badge" style={{ '--cat': hex, marginTop: 4 }}>
              <span className="dot" />
              {block.category}
            </span>
          )}
        </div>

        <div className="timer-wrap">
          <CountdownRing remaining={remSec} total={totalSec} color={ringColor} />
          <div className="timer-center">
            <div>
              <div className="timer-time" style={{ color: ringColor }}>{tt}</div>
              <div className="timer-sub">REMAINING</div>
            </div>
          </div>
        </div>

        <div className="thin-progress">
          <div className="fill" style={{ width: `${elPct}%`, background: ringColor }} />
        </div>

        <div className="now-actions">
          <button className="btn btn-outline" onClick={onComplete}>Complete Early</button>
          <button className="btn btn-outline">Need More Time</button>
        </div>
      </div>

      {nextBlocks.length > 0 && (
        <div className="up-next">
          <div className="head">
            <span className="label-eyebrow">Coming Up</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>NEXT {nextBlocks.length}</span>
          </div>
          {nextBlocks.map(b => {
            const c = b.color || catHex(b.category);
            const startMin = minFromMidnight(new Date(b.start_time));
            return (
              <div key={b.id} className="row" style={{ '--cat': c }}>
                <span className="dot" />
                <div className="name">{b.title}</div>
                <div className="when">{fmtMin(startMin)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── TimelineBlock ─────────────────────────────────────────── */
function TimelineBlock({ block, status, idx, isEditing, onEdit, onCancel, onSave }) {
  const [title, setTitle] = useState(block.title);
  const [category, setCategory] = useState(block.category);
  const [saving, setSaving] = useState(false);

  const hex      = block.color || catHex(block.category);
  const startMin = minFromMidnight(new Date(block.start_time));
  const endMin   = minFromMidnight(new Date(block.end_time));
  const dur      = Math.round(endMin - startMin);
  const top      = yFor(startMin);
  const height   = Math.max(isEditing ? 120 : 40, ((endMin - startMin) / 60) * PX_PER_HOUR - 4);

  const cls = `tl-block ${status === 'past' ? 'past' : ''} ${status === 'active' ? 'active-block' : ''} ${isEditing ? 'editing' : ''}`;

  const StatusIcon =
    status === 'past'   ? <span className="tl-status done"><CheckCircle2 size={11} /></span> :
    status === 'active' ? <span className="tl-status active-s"><Play size={9} /></span> :
                          <span className="tl-status pending"><Minus size={11} /></span>;

  function durLabel(m) {
    const h = Math.floor(m / 60), mn = m % 60;
    if (h && mn) return `${h}h ${mn}m`;
    if (h) return `${h}h`;
    return `${mn}m`;
  }

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onSave(block.id, { title, category });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className={cls} style={{ top: `${top}px`, height: `${height}px`, '--cat': hex, '--d': '0ms', zIndex: 10 }}>
        <div className="edit-form" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            className="edit-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Block title..."
          />
          <div className="edit-row">
            <select
              className="edit-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {Object.keys(CAT_HEX).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="edit-actions">
              <button className="edit-btn cancel" onClick={onCancel} disabled={saving}><X size={14} /></button>
              <button className="edit-btn save" onClick={handleSave} disabled={saving}><Check size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDone = block.status === 'done' || block.status === 'skipped' || status === 'past';

  return (
    <div className={cls} style={{ top: `${top}px`, height: `${height}px`, '--cat': hex, '--d': `${idx * 30}ms` }} onClick={() => !isDone && onEdit(block.id)}>
      <div className="row1">
        <div className="block-title">{block.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isDone && <Pencil size={12} className="edit-hint" />}
          {StatusIcon}
        </div>
      </div>
      <div className="block-meta">
        <span className="pill-badge" style={{ '--cat': hex }}>
          <span className="dot" />{block.category || 'task'}
        </span>
        <span className="block-dur">{fmtMin(startMin)} · {durLabel(dur)}</span>
      </div>
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────── */
function Timeline({ blocks, now, editingId, onEdit, onCancel, onSave }) {
  const nowMin   = minFromMidnight(now);
  const totalH   = (TL_END_H - TL_START_H) * PX_PER_HOUR;

  const ticks = [];
  for (let m = TL_START_H * 60; m <= TL_END_H * 60; m += 30) {
    const isHour = m % 60 === 0;
    ticks.push(
      <div key={m} className={`timeline-tick${isHour ? ' hour' : ''}`} style={{ top: `${yFor(m)}px` }}>
        {isHour ? fmtMin(m) : ''}
      </div>
    );
  }

  return (
    <div className="timeline" style={{ minHeight: `${totalH + 24}px` }}>
      <div className="timeline-axis" style={{ height: `${totalH}px` }}>{ticks}</div>
      <div className="timeline-track" style={{ height: `${totalH}px` }}>
        {blocks.map((b, i) => {
          const startMin = minFromMidnight(new Date(b.start_time));
          const endMin   = minFromMidnight(new Date(b.end_time));
          const status =
            nowMin >= endMin   ? 'past' :
            nowMin >= startMin ? 'active' : 'future';
          return (
            <TimelineBlock
              key={b.id}
              block={b}
              status={status}
              idx={i}
              isEditing={editingId === b.id}
              onEdit={onEdit}
              onCancel={onCancel}
              onSave={onSave}
            />
          );
        })}
        {nowMin >= TL_START_H * 60 && nowMin <= TL_END_H * 60 && (
          <div className="now-line" style={{ top: `${yFor(nowMin)}px` }}>
            <span className="now-label">{fmtMin(nowMin)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CheckInModal ──────────────────────────────────────────── */
function CheckInModal({ block, onClose, onChoose }) {
  if (!block) return null;
  const opts = [
    { id: 'done',  icon: '✅', label: 'Done — move to next',    desc: 'Mark complete and start the next block',      tone: '#22C55E' },
    { id: 'more',  icon: '⏳', label: 'Need more time',         desc: 'Extend by 15, 30, or 45 minutes',             tone: '#E5A93A' },
    { id: 'else',  icon: '🔀', label: 'I did something else',   desc: 'Log what you actually worked on',             tone: '#3B82F6' },
    { id: 'skip',  icon: '⏭',  label: 'Skip this block',        desc: 'Move on without logging time',               tone: '#9E9890' },
  ];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Block complete</h3>
        <div className="modal-sub">{block.title}</div>
        {opts.map(o => (
          <button key={o.id} className="checkin-opt" style={{ '--tone': o.tone }} onClick={() => onChoose(o.id)}>
            <span className="ic" style={{ fontSize: 20 }}>{o.icon}</span>
            <div>
              <div className="lbl">{o.label}</div>
              <div className="desc">{o.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── QuickPlanModal ──────────────────────────────────────────── */
function QuickPlanModal({ currentBlocks, onClose, onConfirm }) {
  const [intent, setIntent] = useState('');
  const [loading, setLoading] = useState(false);
  const [newBlocks, setNewBlocks] = useState(null);
  const [error, setError] = useState(null);
  
  const isReplanning = currentBlocks.length > 0;

  const handleGenerate = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const promptText = isReplanning 
        ? `It is currently ${now.toLocaleTimeString()}. Plan the remaining part of my day based on this intent: ${intent}. Do not schedule anything before the current time.`
        : `Plan my day based on this intent: ${intent}.`;

      const { data } = await api.plan.generate({
        prompt: promptText,
        mood_score: 4, energy_score: 4, mental_state: 'focused'
      });
      setNewBlocks(data.blocks);
    } catch(err) {
      setError(err?.response?.data?.message || 'Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const now = new Date();
    const pastBlocks = isReplanning 
      ? currentBlocks.filter(b => b.status === 'done' || b.status === 'skipped' || new Date(b.end_time) <= now)
      : [];
    
    const finalBlocks = [...pastBlocks, ...newBlocks];
    onConfirm(finalBlocks, intent);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
        <h3>{isReplanning ? 'Re-plan Remaining Day' : 'Plan Your Day'}</h3>
        <p className="modal-sub">
          {isReplanning ? 'Your completed blocks will be preserved. New blocks will be added for the rest of the day.' : 'Brain-dump your intent and we will generate a timeline for you.'}
        </p>

        {!newBlocks ? (
          <>
            <textarea className="textarea" style={{ marginBottom: 16 }}
              placeholder={isReplanning ? "e.g. Next 3 hours I want to deep work on project X, then gym" : "e.g. Morning gym, deep work till 3pm, then reading"}
              value={intent}
              onChange={e => setIntent(e.target.value)}
            />
            {error && <div style={{ color: '#E0524A', marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !intent.trim()}>
                {loading ? 'Generating...' : 'Generate Blocks'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ maxHeight: '40vh', overflowY: 'auto', marginBottom: 20, background: 'var(--bg-3)', padding: 12, borderRadius: 8 }}>
              {newBlocks.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < newBlocks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-3)' }}>
                    {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{b.title}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-outline" onClick={() => setNewBlocks(null)}>← Retry</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleConfirm}>Confirm & Apply</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function Today() {
  const navigate           = useNavigate();
  const { now }            = useLiveClock();
  const todayPlan          = useStore((s) => s.todayPlan);
  const setTodayPlan       = useStore((s) => s.setTodayPlan);
  const triggerCheckin     = useStore((s) => s.triggerCheckin);
  const showCheckinModal   = useStore((s) => s.showCheckinModal);
  const dismissCheckin     = useStore((s) => s.dismissCheckin);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [localCheckin, setLocalCheckin] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const scrollRef = useRef(null);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await api.plan.getToday();
      const data = res.data;
      if (data?.plan) {
        setTodayPlan(data.plan, data.blocks || []);
      } else {
        setTodayPlan(null, []);
        setShowPlanModal(true); // Auto-show if no plan
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBlock = async (id, changes) => {
    try {
      const { data } = await api.plan.updateBlock(id, changes);
      useStore.getState().updateBlock(id, data);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update block:', err);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleConfirmPlan = async (blocks, intent) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.plan.confirm({
        date: today,
        prompt_used: intent,
        mood_score: 4, energy_score: 4, mental_state: 'focused',
        blocks
      });
      setTodayPlan(data.plan, data.blocks);
      setShowPlanModal(false);
    } catch (err) {
      alert('Failed to save plan.');
    }
  };

  useEffect(() => { loadPlan(); }, []); // eslint-disable-line

  const blocks = todayPlan?.blocks || [];

  // Active block
  const activeBlock = blocks.find(b => {
    const s = new Date(b.start_time), e = new Date(b.end_time);
    return now >= s && now < e && b.status !== 'done' && b.status !== 'skipped';
  });

  // Up next (3)
  const nextBlocks = blocks
    .filter(b => new Date(b.start_time) > now && b.status !== 'done' && b.status !== 'skipped')
    .sort((a, b2) => new Date(a.start_time) - new Date(b2.start_time))
    .slice(0, 3);

  // Auto check-in on block end
  useEffect(() => {
    if (!blocks.length || showCheckinModal) return;
    const justEnded = blocks.find(b => {
      const end = new Date(b.end_time), grace = new Date(end.getTime() + 5 * 60000);
      return now >= end && now <= grace && (b.status === 'pending' || b.status === 'active');
    });
    if (justEnded) triggerCheckin(justEnded);
  }, [now]); // eslint-disable-line

  // Scroll to current time on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const target = yFor(minFromMidnight(now)) - 200;
      scrollRef.current.closest('.main-scroll')?.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }, [loading]); // eslint-disable-line

  if (loading) {
    return (
      <div className="page-fade">
        <div className="today-head">
          <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 44, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 320, height: 16 }} />
        </div>
        <div className="today-grid">
          <div className="skeleton" style={{ height: 600, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 400, borderRadius: 18 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <AlertCircle size={40} color="#E0524A" />
        <p style={{ color: 'var(--text-2)', textAlign: 'center', maxWidth: 360 }}>{error}</p>
        <button className="btn btn-outline" onClick={loadPlan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  const today     = now;
  const dayNames  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monNames  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr   = `${dayNames[today.getDay()]}, ${monNames[today.getMonth()]} ${today.getDate()}`;
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);

  return (
    <div className="page-fade" ref={scrollRef}>
      <div className="today-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow">
            <span className="label-eyebrow">{dayNames[today.getDay()]} · Day {dayOfYear} of 365</span>
          </div>
          <h1>Today</h1>
          <div className="sub">
            {dateStr} — {blocks.length} blocks planned
          </div>
        </div>
        <button className="btn btn-outline" onClick={() => setShowPlanModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} /> {blocks.length > 0 ? 'Re-plan' : 'Plan Day'}
        </button>
      </div>

      <div className="today-grid">
        <div onClick={() => editingId && setEditingId(null)}>
          <Timeline
            blocks={blocks}
            now={now}
            editingId={editingId}
            onEdit={setEditingId}
            onCancel={() => setEditingId(null)}
            onSave={handleUpdateBlock}
          />
        </div>
        <NowPanel
          block={activeBlock}
          now={now}
          nextBlocks={nextBlocks}
          onComplete={() => activeBlock && triggerCheckin({ ...activeBlock, _quickDone: true })}
        />
      </div>

      {(showCheckinModal || localCheckin) && (
        <CheckInModal
          block={activeBlock}
          onClose={() => { dismissCheckin(); setLocalCheckin(false); }}
          onChoose={() => { dismissCheckin(); setLocalCheckin(false); }}
        />
      )}

      {showPlanModal && (
        <QuickPlanModal
          currentBlocks={blocks}
          onClose={() => setShowPlanModal(false)}
          onConfirm={handleConfirmPlan}
        />
      )}
    </div>
  );
}
