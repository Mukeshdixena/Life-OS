import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import * as api from '../api/index';

export default function Plan() {
  const navigate = useNavigate();
  const { user, todayPlan, setTodayPlan } = useStore();

  const [step, setStep] = useState(1);
  const [moodScore, setMoodScore] = useState(3);
  const [energyScore, setEnergyScore] = useState(3);
  const [mentalState, setMentalState] = useState('focused');
  const [sleepQuality, setSleepQuality] = useState(3);
  const [prompt, setPrompt] = useState('');
  const [generatedBlocks, setGeneratedBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if plan already exists in store
  useEffect(() => {
    if (todayPlan) {
      navigate('/today', { replace: true });
    }
  }, []);

  // Fetch today's plan on mount — redirect if it exists
  useEffect(() => {
    async function checkPlan() {
      try {
        const { data } = await api.plan.getToday();
        if (data?.plan) {
          setTodayPlan(data.plan, data.blocks || []);
          navigate('/today', { replace: true });
        }
      } catch {
        // No plan yet — stay on this page
      }
    }
    checkPlan();
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setError('');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.plan.generate({
        prompt,
        mood_score: moodScore,
        energy_score: energyScore,
        mental_state: mentalState,
        date: today,
      });
      setGeneratedBlocks(data.blocks || []);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError('');
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.plan.confirm({
        date: today,
        prompt_used: prompt,
        mood_score: moodScore,
        energy_score: energyScore,
        mental_state: mentalState,
        blocks: generatedBlocks,
      });
      setTodayPlan(data.plan, data.blocks);
      navigate('/today');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to confirm plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Morning Check-in ───────────────────────────────
  if (step === 1) {
    return (
      <div
        className="page page-transition"
        style={{ maxWidth: 600, margin: '0 auto', paddingTop: '4rem' }}
      >
        <h1 style={{ fontFamily: 'DM Serif Display', marginBottom: '0.5rem' }}>
          Good morning, {user?.name?.split(' ')[0]} ✨
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
          How are you feeling today?
        </p>

        {/* Energy Level */}
        <label className="label">Energy Level</label>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            ['😴', 'Exhausted', 1],
            ['😐', 'Low', 2],
            ['🙂', 'Okay', 3],
            ['⚡', 'Good', 4],
            ['🚀', 'Amazing', 5],
          ].map(([emoji, label, val]) => (
            <button
              key={val}
              onClick={() => setEnergyScore(val)}
              style={{
                flex: 1,
                padding: '1rem 0.5rem',
                borderRadius: 10,
                border: '2px solid',
                borderColor: energyScore === val ? 'var(--accent)' : 'var(--border)',
                background: energyScore === val ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: '200ms',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{emoji}</div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.25rem',
                }}
              >
                {label}
              </div>
            </button>
          ))}
        </div>

        {/* Mental State */}
        <label className="label">Mental State</label>
        <div
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}
        >
          {['Focused', 'Scattered', 'Stressed', 'Motivated'].map((state) => (
            <button
              key={state}
              onClick={() => setMentalState(state.toLowerCase())}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor:
                  mentalState === state.toLowerCase() ? 'var(--accent)' : 'var(--border)',
                background:
                  mentalState === state.toLowerCase() ? 'var(--accent)' : 'transparent',
                color:
                  mentalState === state.toLowerCase() ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: '200ms',
                fontSize: '0.875rem',
              }}
            >
              {state}
            </button>
          ))}
        </div>

        {/* Overall Mood */}
        <label className="label">Overall Mood</label>
        <div
          style={{ display: 'flex', gap: '0.5rem', fontSize: '1.5rem', marginBottom: '2rem' }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              onClick={() => setMoodScore(n)}
              style={{
                cursor: 'pointer',
                color: n <= moodScore ? '#F59E0B' : 'var(--border)',
                userSelect: 'none',
              }}
            >
              ★
            </span>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setStep(2)}
          style={{ width: '100%', padding: '0.875rem', justifyContent: 'center' }}
        >
          Continue →
        </button>
      </div>
    );
  }

  // ── Step 2: Intent Prompt ──────────────────────────────────
  if (step === 2) {
    return (
      <div
        className="page page-transition"
        style={{ maxWidth: 600, margin: '0 auto', paddingTop: '4rem' }}
      >
        <h2 style={{ fontFamily: 'DM Serif Display', marginBottom: '0.5rem' }}>
          What&apos;s on your plate today?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Just tell me naturally. I&apos;ll build your day around it.
        </p>

        <textarea
          className="textarea"
          rows={8}
          placeholder="E.g., I have a big client presentation at 2pm, need to finish the report before that, want to go for a run, and pick up groceries..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{ marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.6 }}
        />

        {error && (
          <p style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setStep(1)}>
            ← Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{ flex: 1, padding: '0.875rem', justifyContent: 'center' }}
          >
            {loading ? 'Generating your day…' : '✨ Generate My Day'}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div style={{ marginTop: '2rem' }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 60, marginBottom: '0.75rem', borderRadius: 10 }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step 3: Review & Confirm ───────────────────────────────
  return (
    <div className="page page-transition" style={{ paddingTop: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ fontFamily: 'DM Serif Display' }}>Here&apos;s your day 📅</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleGenerate}
            disabled={loading}
          >
            ↺ Regenerate
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            🚀 Start My Day
          </button>
        </div>
      </div>

      {error && (
        <p
          style={{
            color: '#EF4444',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            maxWidth: 600,
            margin: '0 auto 1rem',
          }}
        >
          {error}
        </p>
      )}

      {/* Loading skeleton while regenerating */}
      {loading ? (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 60, marginBottom: '0.75rem', borderRadius: 10 }}
            />
          ))}
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {generatedBlocks.map((block, i) => (
            <div
              key={i}
              className="card"
              style={{
                marginBottom: '0.75rem',
                borderLeft: `3px solid ${block.color}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{block.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {format(new Date(block.start_time), 'h:mm a')} –{' '}
                  {format(new Date(block.end_time), 'h:mm a')}
                </div>
              </div>
              <span
                className="badge"
                style={{
                  background: `${block.color}25`,
                  color: block.color,
                  flexShrink: 0,
                  marginLeft: '1rem',
                }}
              >
                {block.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
