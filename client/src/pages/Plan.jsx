import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowRight, Sparkles, GripVertical, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import * as api from '../api/index';

const CAT_HEX = {
  work: '#3B82F6', health: '#22C55E', learning: '#A855F7',
  relationships: '#F97316', admin: '#6B7280', personal: '#EC4899', sleep: '#1E3A5F',
};

function StepIndicator({ step }) {
  return (
    <div className="steps">
      {[1, 2, 3].map(n => (
        <React.Fragment key={n}>
          <div className={`step${step === n ? ' active' : ''}${step > n ? ' done' : ''}`}>
            <span className="num">{step > n ? '✓' : n}</span>
            <span>{n === 1 ? 'Check in' : n === 2 ? 'Set intent' : 'Review'}</span>
          </div>
          {n < 3 && <div className="step-bar" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Step1({ values, set, onNext }) {
  const energy = [
    { v: 1, em: '😴', l: 'Drained' },
    { v: 2, em: '😐', l: 'Low' },
    { v: 3, em: '🙂', l: 'Okay' },
    { v: 4, em: '⚡', l: 'Energized' },
    { v: 5, em: '🚀', l: 'Fired up' },
  ];
  const moods = ['Focused', 'Scattered', 'Stressed', 'Motivated'];
  const user  = useStore(s => s.user);
  const first = user?.name?.split(' ')[0] || 'there';

  return (
    <>
      <h1 className="plan-h">Good morning, {first}</h1>
      <p className="plan-sub">Take 30 seconds to check in with yourself before we plan.</p>

      <div className="q-row">
        <label>How's your energy?</label>
        <div className="energy-row">
          {energy.map(e => (
            <button key={e.v} className={`energy-btn${values.energy === e.v ? ' sel' : ''}`} onClick={() => set('energy', e.v)}>
              <span className="em">{e.em}</span>
              <span className="lb">{e.l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="q-row">
        <label>Your headspace?</label>
        <div className="mood-row">
          {moods.map(m => (
            <button key={m} className={`mood-pill${values.mood === m ? ' sel' : ''}`} onClick={() => set('mood', m)}>{m}</button>
          ))}
        </div>
      </div>

      <div className="q-row">
        <label>Sleep quality?</label>
        <div className="stars">
          {[1,2,3,4,5].map(n => (
            <button key={n} className={`star-btn${values.sleep >= n ? ' lit' : ''}`} onClick={() => set('sleep', n)}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.9 6.9 7.4.6-5.6 4.9 1.7 7.3-6.4-3.9-6.4 3.9 1.7-7.3-5.6-4.9 7.4-.6z"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-primary btn-large" onClick={onNext}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

function Step2({ values, set, onBack, onNext, loading }) {
  const CHIPS = ['Gym', 'Deep work', 'Reading', 'Meditation', 'Walk', 'Call family'];
  return (
    <>
      <h1 className="plan-h">What's on your plate?</h1>
      <p className="plan-sub">Brain-dump everything. The system will arrange it into blocks.</p>

      <div className="intent-card">
        <span className="label-eyebrow">Today's intent</span>
        <textarea className="textarea" style={{ marginTop: 10 }}
          placeholder="e.g. Morning gym, meetings till 2pm, finish the project, call family, some reading before bed…"
          value={values.intent}
          onChange={e => set('intent', e.target.value)}
        />
        <div className="chip-row">
          {CHIPS.map(c => (
            <button key={c} className="chip"
              onClick={() => set('intent', (values.intent ? values.intent + ', ' : '') + c.toLowerCase())}>
              + {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-large" onClick={onNext} disabled={!values.intent.trim()}>
          <Sparkles size={16} /> Generate my day
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 28 }}>
          <span className="label-eyebrow">Generating</span>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[68, 92, 56, 110, 80, 64].map((h, i) => (
              <div key={i} className="skel" style={{ height: h }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Step3({ blocks, onBack, onConfirm, loading, error }) {
  if (!blocks.length) return (
    <>
      <h1 className="plan-h">Review your day</h1>
      <p className="plan-sub">No blocks generated yet.</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <button className="btn btn-outline" onClick={onBack}>← Re-generate</button>
      </div>
    </>
  );

  const totalMins = blocks.reduce((s, b) => {
    const dur = (new Date(b.end_time) - new Date(b.start_time)) / 60000;
    return s + dur;
  }, 0);
  const totalH = `${Math.floor(totalMins / 60)}h ${Math.round(totalMins % 60)}m`;

  return (
    <>
      <h1 className="plan-h">Review your day</h1>
      <p className="plan-sub">Confirm when ready to start.</p>

      {error && (
        <div style={{ color: '#E0524A', marginBottom: 16, padding: '10px 14px', background: 'color-mix(in srgb, #E0524A 10%, transparent)', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="review-grid">
        <div className="card" style={{ padding: 16 }}>
          {blocks.map((b, i) => {
            const c = b.color || CAT_HEX[b.category] || '#6B7280';
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '20px 60px 1fr auto auto',
                gap: 12, alignItems: 'center', padding: '10px 6px',
                borderTop: i ? '1px dashed var(--border)' : 'none',
              }}>
                <GripVertical size={16} color="var(--text-3)" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {format(new Date(b.start_time), 'h:mm a')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 3, height: 18, background: c, borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{b.title}</span>
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000)}m
                </span>
                <Pencil size={14} color="var(--text-3)" />
              </div>
            );
          })}
        </div>

        <div>
          <div className="card">
            <span className="label-eyebrow">Summary</span>
            <div style={{ marginTop: 14 }}>
              <div className="summary-stat"><span>Total planned</span><span className="v">{totalH}</span></div>
              <div className="summary-stat"><span>Blocks</span><span className="v">{blocks.length}</span></div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <span className="label-eyebrow">By category</span>
            <div className="cat-bar" style={{ marginTop: 14 }}>
              {Object.entries(
                blocks.reduce((acc, b) => {
                  const dur = (new Date(b.end_time) - new Date(b.start_time)) / 60000;
                  acc[b.category] = (acc[b.category] || 0) + dur;
                  return acc;
                }, {})
              ).map(([cat, dur]) => (
                <div key={cat} style={{ width: `${(dur / totalMins) * 100}%`, background: CAT_HEX[cat] || '#6B7280' }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {[...new Set(blocks.map(b => b.category))].map(cat => (
                <span key={cat} className="pill-badge" style={{ '--cat': CAT_HEX[cat] || '#6B7280' }}>
                  <span className="dot" />{cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <button className="btn btn-outline" onClick={onBack} disabled={loading}>← Re-generate</button>
        <button className="btn btn-primary btn-large" onClick={onConfirm} disabled={loading}>
          {loading ? 'Saving…' : <>Start my day <ArrowRight size={16} /></>}
        </button>
      </div>
    </>
  );
}

export default function Plan() {
  const navigate    = useNavigate();
  const { user, todayPlan, setTodayPlan } = useStore();

  const [step,   setStep]   = useState(1);
  const [values, setValues] = useState({ energy: 4, mood: 'Focused', sleep: 4, intent: '' });
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setValues(s => ({ ...s, [k]: v }));

  useEffect(() => {
    if (todayPlan) { navigate('/today', { replace: true }); return; }
    api.plan.getToday()
      .then(({ data }) => { if (data?.plan) { setTodayPlan(data.plan, data.blocks || []); navigate('/today', { replace: true }); } })
      .catch(() => {});
  }, []); // eslint-disable-line

  async function generate() {
    if (!values.intent.trim()) return;
    setError('');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.plan.generate({
        prompt: values.intent,
        mood_score: values.mood === 'Focused' || values.mood === 'Motivated' ? 4 : 2,
        energy_score: values.energy,
        mental_state: values.mood.toLowerCase(),
        date: today,
      });
      setBlocks(data.blocks || []);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError('');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.plan.confirm({
        date: today,
        prompt_used: values.intent,
        mood_score: values.mood === 'Focused' || values.mood === 'Motivated' ? 4 : 2,
        energy_score: values.energy,
        mental_state: values.mood.toLowerCase(),
        blocks,
      });
      setTodayPlan(data.plan, data.blocks);
      navigate('/today');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to confirm. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-fade plan-wrap">
      <StepIndicator step={step} />
      {step === 1 && <Step1 values={values} set={set} onNext={() => setStep(2)} />}
      {step === 2 && (
        <Step2 values={values} set={set} loading={loading}
          onBack={() => setStep(1)}
          onNext={() => { setStep(2); generate(); }} />
      )}
      {step === 3 && (
        <Step3 blocks={blocks} onBack={() => setStep(2)}
          onConfirm={confirm} loading={loading} error={error} />
      )}
    </div>
  );
}
