import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, RefreshCw, CheckCircle2, Play, 
  Minus, Pencil, X, Check, Sparkles, ChevronLeft, 
  ChevronRight, Clock, Target, Zap, Trash2, Calendar
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLiveClock } from '../hooks/useLiveClock';
import * as api from '../api/index';

/* ── Constants ─────────────────────────────────────────────── */
const PX_PER_HOUR = 80;
const TL_START_H  = 6;   // 6am
const TL_END_H    = 23;  // 11pm

const CAT_HEX = {
  work: '#3B82F6', health: '#22C55E', learning: '#A855F7',
  relationships: '#F97316', admin: '#6B7280', personal: '#EC4899', sleep: '#1E3A5F',
};
function catHex(c) { return CAT_HEX[c] || '#6B7280'; }

/* ── Helpers ────────────────────────────────────────────────── */
function minFromMidnight(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}
function yFor(min) { return ((min - TL_START_H * 60) / 60) * PX_PER_HOUR; }
function fmtTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.floor(min % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2,'0')}${ap}`;
}

// Logic for side-by-side overlapping blocks (Cluster-aware)
function layoutBlocks(blocks) {
  if (!blocks.length) return [];

  const sorted = [...blocks].sort((a, b) => {
    const sA = minFromMidnight(a.start_time);
    const sB = minFromMidnight(b.start_time);
    if (sA !== sB) return sA - sB;
    return minFromMidnight(b.end_time) - minFromMidnight(a.end_time);
  });

  const clusters = [];
  let lastClusterEnd = -1;

  // Group into clusters of overlapping blocks
  sorted.forEach(block => {
    const start = minFromMidnight(block.start_time);
    const end = minFromMidnight(block.end_time);
    if (start >= lastClusterEnd) {
      clusters.push([]);
    }
    clusters[clusters.length - 1].push(block);
    lastClusterEnd = Math.max(lastClusterEnd, end);
  });

  // For each cluster, calculate column layout
  clusters.forEach(cluster => {
    const columns = [];
    cluster.forEach(block => {
      const start = minFromMidnight(block.start_time);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (minFromMidnight(lastInCol.end_time) <= start) {
          columns[i].push(block);
          block.col = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        block.col = columns.length;
        columns.push([block]);
      }
    });

    const totalCols = columns.length;
    cluster.forEach(block => {
      block.width = 100 / totalCols;
      block.left = (block.col / totalCols) * 100;
    });
  });

  return sorted;
}

/* ── Components ─────────────────────────────────────────────── */

function BlockPopover({ block, position, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(block?.title || '');
  const [category, setCategory] = useState(block?.category || 'work');
  const [startTime, setStartTime] = useState(block ? new Date(block.start_time).toTimeString().slice(0,5) : (position.startTime || '09:00'));
  const [endTime, setEndTime] = useState(block ? new Date(block.end_time).toTimeString().slice(0,5) : (position.endTime || '10:00'));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const datePrefix = new Date().toISOString().split('T')[0];
    const data = {
      title,
      category,
      start_time: `${datePrefix}T${startTime}:00Z`,
      end_time: `${datePrefix}T${endTime}:00Z`,
    };
    await onSave(block?.id, data);
    setSaving(false);
  };

  return (
    <div className="block-popover" style={{ top: position.y, left: position.x }}>
      <div className="popover-header">
        <h3>{block ? 'Edit Block' : 'New Block'}</h3>
        <button className="btn btn-ghost" onClick={onClose}><X size={16}/></button>
      </div>
      
      <div className="popover-field">
        <label>Title</label>
        <input className="popover-input" value={title} onChange={e=>setTitle(e.target.value)} autoFocus />
      </div>

      <div className="popover-field">
        <label>Category</label>
        <select className="popover-input" value={category} onChange={e=>setCategory(e.target.value)}>
          {Object.keys(CAT_HEX).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="popover-field" style={{ flex: 1 }}>
          <label>Start</label>
          <input type="time" className="popover-input" value={startTime} onChange={e=>setStartTime(e.target.value)} />
        </div>
        <div className="popover-field" style={{ flex: 1 }}>
          <label>End</label>
          <input type="time" className="popover-input" value={endTime} onChange={e=>setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="popover-actions">
        {block && <button className="btn btn-ghost" onClick={()=>onDelete(block.id)} style={{ color: '#E0524A', marginRight: 'auto' }}><Trash2 size={16}/></button>}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !title.trim()}>
          {saving ? 'Saving...' : 'Save Block'}
        </button>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const dates = [];
  for (let i = 0; i < firstDay; i++) dates.push({ d: null });
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = i === now.getDate() && viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
    dates.push({ d: i, today: isToday });
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <span>{monthName}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={()=>setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))}><ChevronLeft size={14}/></button>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={()=>setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))}><ChevronRight size={14}/></button>
        </div>
      </div>
      <div className="mini-cal-grid">
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="mini-cal-day-label">{d}</div>)}
        {dates.map((dt, i) => (dt.d ? <div key={i} className={`mini-cal-date ${dt.today ? 'today' : ''}`}>{dt.d}</div> : <div key={i}/>))}
      </div>
    </div>
  );
}

function CountdownRing({ remaining, total, color }) {
  const size = 180, stroke = 8, r = (size - stroke) / 2 - 4;
  const circ = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, remaining / total));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity="0.3" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} stroke={color} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 1s linear' }} />
    </svg>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function Today() {
  const navigate = useNavigate();
  const { now } = useLiveClock();
  const todayPlan = useStore(s => s.todayPlan);
  const setTodayPlan = useStore(s => s.setTodayPlan);
  const triggerCheckin = useStore(s => s.triggerCheckin);
  const showCheckinModal = useStore(s => s.showCheckinModal);
  const dismissCheckin = useStore(s => s.dismissCheckin);

  const [loading, setLoading] = useState(true);
  const [popover, setPopover] = useState(null); 
  const [dragInfo, setDragInfo] = useState(null); // { mode, startMin, endMin, blockId, offset }
  const gridRef = useRef(null);
  const isDragging = useRef(false);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await api.plan.getToday();
      if (res.data?.plan) setTodayPlan(res.data.plan, res.data.blocks || []);
      else setTodayPlan(null, []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadPlan(); }, []);

  const blocks = useMemo(() => {
    const raw = todayPlan?.blocks || [];
    const filtered = raw.filter(b => b.status !== 'skipped');
    return layoutBlocks(filtered);
  }, [todayPlan?.blocks]);
  const nowMin = minFromMidnight(now);

  const activeBlock = blocks.find(b => {
    const s = minFromMidnight(b.start_time), e = minFromMidnight(b.end_time);
    return nowMin >= s && nowMin < e && b.status !== 'done';
  });

  const handleMouseDown = (e, block = null, mode = 'create') => {
    e.stopPropagation();
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const min = Math.round((y / PX_PER_HOUR) * 4) * 15 + TL_START_H * 60;

    if (mode === 'create') {
      // Allow clicks on the container itself OR the background hour rows
      const isGridBackground = e.target.classList.contains('cal-slots-col') || e.target.classList.contains('cal-hour-row');
      if (!isGridBackground) return;
      setDragInfo({ mode: 'create', startMin: min, endMin: min + 15 });
    } else if (mode === 'move') {
      const blockStart = minFromMidnight(block.start_time);
      setDragInfo({ mode: 'move', blockId: block.id, startMin: blockStart, endMin: minFromMidnight(block.end_time), offset: min - blockStart });
    } else if (mode === 'resize') {
      setDragInfo({ mode: 'resize', blockId: block.id, startMin: minFromMidnight(block.start_time), endMin: minFromMidnight(block.end_time) });
    }
    
    isDragging.current = true;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !dragInfo) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const currentMin = Math.round((y / PX_PER_HOUR) * 4) * 15 + TL_START_H * 60;

    if (dragInfo.mode === 'create') {
      if (currentMin > dragInfo.startMin) {
        setDragInfo({ ...dragInfo, endMin: currentMin });
      }
    } else if (dragInfo.mode === 'move') {
      const duration = dragInfo.endMin - dragInfo.startMin;
      const newStart = currentMin - dragInfo.offset;
      setDragInfo({ ...dragInfo, startMin: newStart, endMin: newStart + duration });
    } else if (dragInfo.mode === 'resize') {
      if (currentMin > dragInfo.startMin) {
        setDragInfo({ ...dragInfo, endMin: currentMin });
      }
    }
  };

  const handleMouseUp = async (e) => {
    if (!isDragging.current || !dragInfo) return;
    isDragging.current = false;
    
    const { mode, startMin, endMin, blockId } = dragInfo;
    setDragInfo(null);

    if (mode === 'create') {
      const end = Math.max(startMin + 15, endMin);
      setPopover({ 
        block: null, x: e.clientX, y: e.clientY, 
        startTime: fmtTime24(startMin), endTime: fmtTime24(end) 
      });
    } else {
      const datePrefix = new Date().toISOString().split('T')[0];
      const data = {
        start_time: `${datePrefix}T${fmtTime24(startMin)}:00Z`,
        end_time: `${datePrefix}T${fmtTime24(endMin)}:00Z`,
      };
      await handleSaveBlock(blockId, data);
    }
  };

  function fmtTime24(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  const handleSaveBlock = async (id, data) => {
    try {
      if (id) {
        const res = await api.plan.updateBlock(id, data);
        useStore.getState().updateBlock(id, res.data);
      } else {
        const res = await api.plan.createBlock(data);
        // Refresh full plan to ensure layout is recalculated with new block
        await loadPlan();
      }
      setPopover(null);
    } catch (err) { 
      console.error(err);
      alert('Error saving block'); 
    }
  };

  const handleDeleteBlock = async (id) => {
    if (!window.confirm('Delete this block?')) return;
    try {
      // Assuming a delete endpoint exists or using update status
      await api.plan.updateBlock(id, { status: 'skipped' }); 
      useStore.getState().updateBlock(id, { ...activeBlock, status: 'skipped' });
      await loadPlan();
      setPopover(null);
    } catch (err) { alert('Error deleting block'); }
  };

  const handleExtend = async () => {
    if (!activeBlock) return;
    const newEnd = new Date(new Date(activeBlock.end_time).getTime() + 15 * 60000);
    await handleSaveBlock(activeBlock.id, { end_time: newEnd.toISOString() });
  };

  useEffect(() => {
    if (!loading && gridRef.current) {
      gridRef.current.scrollTo({ top: Math.max(0, yFor(nowMin) - 150), behavior: 'smooth' });
    }
  }, [loading]);

  if (loading) return <div className="page-fade" style={{ padding: 40 }}>Crafting your day...</div>;

  const totalH = blocks.reduce((a, b) => a + (minFromMidnight(b.end_time) - minFromMidnight(b.start_time))/60, 0);
  const doneH  = blocks.filter(b=>b.status==='done').reduce((a, b) => a + (minFromMidnight(b.end_time) - minFromMidnight(b.start_time))/60, 0);

  return (
    <div className="calendar-container">
      <aside className="cal-left-sidebar">
        <MiniCalendar />
        <div className="stats-list">
          <div className="stat-pill"><span className="label">Planned</span><span className="value">{totalH.toFixed(1)}h</span></div>
          <div className="stat-pill"><span className="label">Focus Score</span><span className="value">{Math.round((doneH/(totalH||1))*100)}%</span></div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 'auto' }} onClick={() => navigate('/plan')}><Sparkles size={16}/> Smart Plan</button>
      </aside>

      <section className="cal-center-view">
        <header className="cal-header">
          <h1>{now.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</h1>
          <button className="btn btn-outline" onClick={loadPlan}><RefreshCw size={14}/></button>
        </header>
        
        <div className="day-stats-row">
          <div className="day-stat"><span className="val">{blocks.length}</span><span className="lbl">Blocks</span></div>
          <div className="day-stat"><span className="val">{blocks.filter(b=>b.status==='done').length}</span><span className="lbl">Done</span></div>
          <div className="day-stat"><span className="val">{Math.round(totalH)}h</span><span className="lbl">Capacity</span></div>
        </div>

        <div className="cal-grid-scroll" ref={gridRef}>
          <div className="cal-grid">
            <div className="cal-time-col">
              {Array.from({ length: TL_END_H - TL_START_H + 1 }).map((_, i) => (
                <div key={i} className="cal-time-label">{fmtTime((TL_START_H + i) * 60)}</div>
              ))}
            </div>
            <div className="cal-slots-col" 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { isDragging.current = false; setDragInfo(null); }}
            >
              {Array.from({ length: TL_END_H - TL_START_H + 1 }).map((_, i) => <div key={i} className="cal-hour-row" />)}
              {nowMin >= TL_START_H * 60 && nowMin <= TL_END_H * 60 && <div className="cal-now-line" style={{ top: yFor(nowMin) }} />}
              
              {/* Ghost Block */}
              {dragInfo && (
                <div className={`cal-block ghost ${dragInfo.mode === 'create' ? 'creating' : 'modifying'}`} 
                  style={{ 
                    top: yFor(dragInfo.startMin), 
                    height: yFor(dragInfo.endMin) - yFor(dragInfo.startMin),
                    opacity: 0.5,
                    background: dragInfo.mode === 'create' ? 'var(--accent)' : 'var(--cat-health)',
                    border: '2px dashed var(--accent)',
                    left: 0, width: '100%',
                    zIndex: 100
                  }} 
                />
              )}
              {blocks.map(b => (
                <div key={b.id} 
                  className={`cal-block ${activeBlock?.id === b.id ? 'active' : ''} ${dragInfo?.blockId === b.id ? 'dragging' : ''}`}
                  style={{ 
                    top: yFor(minFromMidnight(b.start_time)), 
                    height: yFor(minFromMidnight(b.end_time)) - yFor(minFromMidnight(b.start_time)) - 2, 
                    left: `calc(${b.left}% + 4px)`, 
                    width: `calc(${b.width}% - 8px)`, 
                    '--cat': catHex(b.category),
                    opacity: dragInfo?.blockId === b.id ? 0.3 : 1
                  }}
                  onMouseDown={(e) => handleMouseDown(e, b, 'move')}
                  onClick={(e) => { e.stopPropagation(); setPopover({ block: b, x: e.clientX, y: e.clientY }); }}
                >
                  <span className="time">{fmtTime(minFromMidnight(b.start_time))}</span>
                  <span className="title">{b.title}</span>
                  
                  {/* Resize Handle */}
                  <div className="resizer-s" onMouseDown={(e) => handleMouseDown(e, b, 'resize')} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="cal-right-panel">
        <div className="now-card" style={{ '--cat': catHex(activeBlock?.category), width: '100%' }}>
           <span className="now-eyebrow">Focusing On</span>
           <h2 style={{ fontSize: 24 }}>{activeBlock?.title || 'Relax Time'}</h2>
           {activeBlock && (
             <div className="timer-wrap">
               <CountdownRing remaining={Math.max(0, (new Date(activeBlock.end_time)-now)/1000)} total={(new Date(activeBlock.end_time)-new Date(activeBlock.start_time))/1000} color={catHex(activeBlock.category)} />
               <div className="timer-center"><span style={{ fontSize: 32, fontWeight: 700 }}>{Math.ceil((new Date(activeBlock.end_time)-now)/60000)}m</span><span className="timer-sub">REMAINING</span></div>
             </div>
           )}
           <div className="now-actions">
              <button className="btn btn-primary" disabled={!activeBlock} onClick={() => triggerCheckin(activeBlock)}>Complete</button>
              <button className="btn btn-outline" disabled={!activeBlock} onClick={handleExtend}>+15m</button>
           </div>
        </div>
        <div className="up-next" style={{ width: '100%', background: 'var(--bg-3)', border: 'none' }}>
           <div className="head"><span className="label-eyebrow">Upcoming</span></div>
           {blocks.filter(b => minFromMidnight(b.start_time) > nowMin).slice(0,3).map(b => (
             <div key={b.id} className="row" style={{ '--cat': catHex(b.category) }}>
               <div className="dot"/><div className="name">{b.title}</div><div className="when">{fmtTime(minFromMidnight(b.start_time))}</div>
             </div>
           ))}
        </div>
      </aside>

      {popover && <BlockPopover block={popover.block} position={{ x: Math.min(window.innerWidth - 340, popover.x), y: Math.min(window.innerHeight - 400, popover.y) }} onClose={()=>setPopover(null)} onSave={handleSaveBlock} onDelete={handleDeleteBlock} />}
      {showCheckinModal && <div className="modal-back" onClick={dismissCheckin}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Checkpoint</h3><div className="popover-actions"><button className="btn btn-primary" onClick={dismissCheckin}>Done</button></div></div></div>}
    </div>
  );
}
