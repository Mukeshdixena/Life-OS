import { useState } from 'react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';

export default function Review() {
  const todayPlan = useStore((s) => s.todayPlan);

  const [wins, setWins] = useState('');
  const [improvements, setImprovements] = useState('');
  const [overallRating, setOverallRating] = useState(3);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const blocksCount = todayPlan?.blocks?.length ?? 0;

  function handleSubmit() {
    setLoading(true);

    const review = {
      date: new Date().toISOString().split('T')[0],
      overall_rating: overallRating,
      wins,
      improvements,
      mood_score: todayPlan?.plan?.mood_score ?? null,
      energy_score: todayPlan?.plan?.energy_score ?? null,
      blocks_planned: blocksCount,
      saved_at: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('life-os-reviews') || '[]');
      // Replace review for today if one already exists
      const today = review.date;
      const filtered = existing.filter((r) => r.date !== today);
      filtered.push(review);
      localStorage.setItem('life-os-reviews', JSON.stringify(filtered));
    } catch {
      // Ignore storage errors
    }

    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div
      className="page page-transition"
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      <h1 className="section-title">Day Review</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {format(new Date(), 'EEEE, MMMM d')}
      </p>

      {/* Stats summary */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div className="stat-value">{blocksCount}</div>
            <div className="stat-label">Blocks planned</div>
          </div>
          <div>
            <div className="stat-value">{todayPlan?.plan?.mood_score ?? '–'}</div>
            <div className="stat-label">Mood score</div>
          </div>
          <div>
            <div className="stat-value">{todayPlan?.plan?.energy_score ?? '–'}</div>
            <div className="stat-label">Energy score</div>
          </div>
        </div>
      </div>

      {/* Overall rating */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label className="label">How was your day overall?</label>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.75rem' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              onClick={() => setOverallRating(n)}
              style={{
                cursor: 'pointer',
                color: n <= overallRating ? '#F59E0B' : 'var(--border)',
                userSelect: 'none',
              }}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Wins */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label className="label">🏆 Wins today</label>
        <textarea
          className="textarea"
          rows={3}
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          placeholder="What went well?"
        />
      </div>

      {/* Improvements */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <label className="label">💡 What could be better</label>
        <textarea
          className="textarea"
          rows={3}
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          placeholder="What would you do differently?"
        />
      </div>

      {submitted ? (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--accent)',
            padding: '1rem',
            fontSize: '1rem',
          }}
        >
          ✅ Day reviewed! Great work today.
        </div>
      ) : (
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '0.875rem', justifyContent: 'center' }}
        >
          {loading ? 'Saving…' : 'Complete Day Review'}
        </button>
      )}
    </div>
  );
}
