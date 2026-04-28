import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import * as api from '../api/index';

/* ─────────────────────────────────────────────
   Outcome options config
───────────────────────────────────────────── */
const OUTCOMES = [
  { id: 'done',              emoji: '✅', label: 'Done! Move on' },
  { id: 'skipped',           emoji: '⏭️', label: 'Skip this block' },
  { id: 'did_something_else', emoji: '🔀', label: 'Did something else' },
  { id: 'extended',          emoji: '⏳', label: 'Need more time' },
];

const TIME_ROI_OPTIONS = [
  ['earned',      '💰 Earned'],
  ['growth',      '📈 Growth'],
  ['maintenance', '🔧 Maintenance'],
  ['low_value',   '⬇️ Low value'],
];

const EXTRA_MINUTE_PRESETS = [15, 30, 45];

/* ─────────────────────────────────────────────
   CheckInModal
───────────────────────────────────────────── */
export default function CheckInModal() {
  /* ── Store ──────────────────────────────── */
  const completingBlock = useStore((s) => s.completingBlock);
  const dismissCheckin  = useStore((s) => s.dismissCheckin);
  const setBlocks       = useStore((s) => s.setBlocks);

  /* ── Local state ────────────────────────── */
  const [outcome,           setOutcome]           = useState(
    completingBlock?._quickDone ? 'done' : '',
  );
  const [extraMinutes,      setExtraMinutes]      = useState(15);
  const [customMinutes,     setCustomMinutes]     = useState(15);
  const [notes,             setNotes]             = useState('');
  const [alternateActivity, setAlternateActivity] = useState('');
  const [timeRoi,           setTimeRoi]           = useState('earned');
  const [canDismiss,        setCanDismiss]        = useState(false);
  const [dismissCountdown,  setDismissCountdown]  = useState(30);
  const [loading,           setLoading]           = useState(false);
  const [submitError,       setSubmitError]       = useState(null);

  /* ── 30-second dismiss lockout countdown ── */
  useEffect(() => {
    if (canDismiss) return;
    const timer = setInterval(() => {
      setDismissCountdown((prev) => {
        if (prev <= 1) {
          setCanDismiss(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Guard: nothing to render without a block ── */
  if (!completingBlock) return null;

  /* ── Submit handler ─────────────────────── */
  const handleSubmit = async () => {
    if (!outcome || loading) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const payload = {
        block_id:           completingBlock.id,
        outcome,
        extra_minutes:      outcome === 'extended' ? extraMinutes : 0,
        notes:              notes.trim(),
        alternate_activity: outcome === 'did_something_else' ? alternateActivity.trim() : '',
        time_roi:           outcome !== 'skipped' ? timeRoi : undefined,
      };
      const res = await api.checkins.submit(payload);

      // Backend may return updated blocks list
      if (res.data?.blocks) {
        setBlocks(res.data.blocks);
      }

      dismissCheckin();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err.message || 'Failed to submit check-in. Please try again.',
      );
      setLoading(false);
    }
  };

  /* ── Handle custom minute input ─────────── */
  const handleCustomMinutes = (val) => {
    const n = Math.max(5, Math.min(180, Number(val) || 5));
    setCustomMinutes(n);
    setExtraMinutes(n);
  };

  /* ── Overlay click: only dismiss if allowed ── */
  const handleOverlayClick = () => {
    if (canDismiss) dismissCheckin();
  };

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
      >

        {/* ── Header ──────────────────────────── */}
        <div
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'flex-start',
            marginBottom:   '1.5rem',
          }}
        >
          <div>
            <h3 style={{ fontFamily: 'DM Serif Display', fontSize: '1.3rem' }}>
              Block Complete 🎯
            </h3>
            <p
              style={{
                color:     'var(--text-muted)',
                fontSize:  '0.875rem',
                marginTop: '0.25rem',
              }}
            >
              {completingBlock.title}
            </p>
          </div>

          <button
            onClick={canDismiss ? dismissCheckin : undefined}
            style={{
              opacity:      canDismiss ? 1 : 0.4,
              cursor:       canDismiss ? 'pointer' : 'default',
              background:   'var(--bg-tertiary)',
              border:       'none',
              borderRadius: 8,
              padding:      '0.4rem 0.75rem',
              color:        'var(--text-secondary)',
              fontSize:     '0.8rem',
              flexShrink:   0,
              marginLeft:   '1rem',
            }}
          >
            {canDismiss ? '✕ Close' : `✕ ${dismissCountdown}s`}
          </button>
        </div>

        {/* ── "What happened?" label ──────────── */}
        <p
          style={{
            fontSize:      '0.8rem',
            fontWeight:    600,
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom:  '0.75rem',
          }}
        >
          What happened?
        </p>

        {/* ── Outcome grid ────────────────────── */}
        <div
          style={{
            display:               'grid',
            gridTemplateColumns:   '1fr 1fr',
            gap:                   '0.75rem',
            marginBottom:          '1rem',
          }}
        >
          {OUTCOMES.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setOutcome(opt.id)}
              style={{
                padding:      '1rem',
                borderRadius: 12,
                border:       '2px solid',
                borderColor:  outcome === opt.id ? 'var(--accent)' : 'var(--border)',
                background:   outcome === opt.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                cursor:       'pointer',
                textAlign:    'center',
                transition:   '200ms',
                fontSize:     '0.875rem',
                fontWeight:   500,
                color:        'var(--text-primary)',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{opt.emoji}</div>
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Extended: extra-time selector ───── */}
        {outcome === 'extended' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              How much more time?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {EXTRA_MINUTE_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setExtraMinutes(m);
                    setCustomMinutes(m);
                  }}
                  style={{
                    padding:      '0.5rem 1rem',
                    borderRadius: 8,
                    border:       '1.5px solid',
                    borderColor:  extraMinutes === m ? 'var(--accent)' : 'var(--border)',
                    background:   extraMinutes === m ? 'var(--accent)' : 'transparent',
                    color:        extraMinutes === m ? 'white' : 'var(--text-primary)',
                    cursor:       'pointer',
                    fontWeight:   500,
                    fontSize:     '0.875rem',
                    transition:   '200ms',
                  }}
                >
                  +{m} min
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={180}
                value={customMinutes}
                onChange={(e) => handleCustomMinutes(e.target.value)}
                className="input"
                style={{ width: 80, padding: '0.5rem', textAlign: 'center' }}
                placeholder="Custom"
              />
            </div>
          </div>
        )}

        {/* ── Did something else: alternate activity ── */}
        {outcome === 'did_something_else' && (
          <div style={{ marginBottom: '1rem' }}>
            <label className="label">What did you do instead?</label>
            <input
              className="input"
              value={alternateActivity}
              onChange={(e) => setAlternateActivity(e.target.value)}
              placeholder="e.g., Responded to urgent emails..."
            />
          </div>
        )}

        {/* ── Notes (always shown) ─────────────── */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="label">Notes (optional)</label>
          <textarea
            className="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any reflections on this block..."
            style={{ minHeight: 'auto', resize: 'vertical' }}
          />
        </div>

        {/* ── Time ROI (hidden for skipped) ────── */}
        {outcome && outcome !== 'skipped' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Time ROI</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {TIME_ROI_OPTIONS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTimeRoi(id)}
                  style={{
                    padding:      '0.4rem 0.875rem',
                    borderRadius: 20,
                    border:       '1.5px solid',
                    borderColor:  timeRoi === id ? 'var(--accent)' : 'var(--border)',
                    background:   timeRoi === id ? 'var(--accent)' : 'transparent',
                    color:        timeRoi === id ? 'white' : 'var(--text-secondary)',
                    cursor:       'pointer',
                    fontSize:     '0.8rem',
                    transition:   '200ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Error message ─────────────────────── */}
        {submitError && (
          <p
            style={{
              color:        '#EF4444',
              fontSize:     '0.82rem',
              marginBottom: '0.75rem',
              padding:      '0.5rem 0.75rem',
              background:   '#EF444415',
              borderRadius: 8,
            }}
          >
            {submitError}
          </p>
        )}

        {/* ── Submit button ─────────────────────── */}
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!outcome || loading}
          style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', justifyContent: 'center' }}
        >
          {loading ? 'Saving...' : 'Submit Check-in'}
        </button>
      </div>
    </div>
  );
}
