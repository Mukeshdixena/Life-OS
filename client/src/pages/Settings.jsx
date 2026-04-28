import { useState, useEffect } from 'react';
import { useStore, CATEGORY_COLORS } from '../store/useStore';
import * as api from '../api/index';
import ThemeToggle from '../components/ThemeToggle';

// ── Profile Section ────────────────────────────────────────
function ProfileSection({ user }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'DM Serif Display', marginBottom: '1.5rem' }}>Profile</h2>

      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="label" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            type="text"
            className="input"
            value={user?.name || ''}
            readOnly
            style={{ cursor: 'default', opacity: 0.8 }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label" htmlFor="profile-email">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            className="input"
            value={user?.email || ''}
            readOnly
            style={{ cursor: 'default', opacity: 0.8 }}
          />
        </div>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            padding: '0.75rem 1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          Profile editing coming soon.
        </p>
      </div>
    </div>
  );
}

// ── Habits Section ─────────────────────────────────────────
function HabitsSection({ habits, onAdd, onToggle, newHabitName, setNewHabitName }) {
  const [newCategory, setNewCategory] = useState('health');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newHabitName.trim()) return;
    setAdding(true);
    await onAdd(newHabitName.trim(), newCategory);
    setAdding(false);
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'DM Serif Display', marginBottom: '1.5rem' }}>Habits</h2>

      {/* Habit list */}
      {habits.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No habits yet. Add your first habit below.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="card"
              style={{
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.personal,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: 500,
                    color: habit.is_active ? 'var(--text-primary)' : 'var(--text-muted)',
                    textDecoration: habit.is_active ? 'none' : 'line-through',
                  }}
                >
                  {habit.name}
                </span>
                <span
                  className="badge"
                  style={{
                    background: `${CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.personal}20`,
                    color: CATEGORY_COLORS[habit.category] || CATEGORY_COLORS.personal,
                  }}
                >
                  {habit.category}
                </span>
              </div>

              {/* Toggle */}
              <button
                onClick={() => onToggle(habit)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  background: habit.is_active ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 200ms',
                  flexShrink: 0,
                }}
                aria-label={habit.is_active ? 'Deactivate habit' : 'Activate habit'}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: habit.is_active ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 200ms',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add habit form */}
      <div className="card">
        <h3
          style={{
            fontFamily: 'DM Serif Display',
            fontSize: '1.1rem',
            marginBottom: '1rem',
          }}
        >
          Add Habit
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            placeholder="Habit name (e.g. Morning run)"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ flex: 1, minWidth: 160 }}
          />
          <select
            className="input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{ width: 160, flexShrink: 0 }}
          >
            {Object.keys(CATEGORY_COLORS).filter((c) => c !== 'sleep').map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={adding || !newHabitName.trim()}
        >
          {adding ? 'Adding…' : '+ Add Habit'}
        </button>
      </div>
    </div>
  );
}

// ── Theme Section ──────────────────────────────────────────
function ThemeSection() {
  const { theme, toggleTheme } = useStore();

  return (
    <div>
      <h2 style={{ fontFamily: 'DM Serif Display', marginBottom: '1.5rem' }}>Theme</h2>

      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Choose how Life OS looks. Your preference is saved automatically.
        </p>

        {/* Visual theme picker */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Light preview */}
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            style={{
              flex: 1,
              padding: '1.25rem',
              borderRadius: 12,
              border: '2px solid',
              borderColor: theme === 'light' ? 'var(--accent)' : 'var(--border)',
              background: '#F8F7F4',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color 200ms',
            }}
          >
            <div
              style={{
                width: '100%',
                height: 60,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E5E2DA',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <div style={{ width: 40, height: 8, borderRadius: 4, background: '#1A1814' }} />
              <div style={{ width: 24, height: 8, borderRadius: 4, background: '#E5E2DA' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1814' }}>
              Light
            </span>
            {theme === 'light' && (
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#2563EB',
                  marginTop: '0.25rem',
                }}
              >
                ✓ Active
              </span>
            )}
          </button>

          {/* Dark preview */}
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            style={{
              flex: 1,
              padding: '1.25rem',
              borderRadius: 12,
              border: '2px solid',
              borderColor: theme === 'dark' ? 'var(--accent)' : 'var(--border)',
              background: '#0F0E0C',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'border-color 200ms',
            }}
          >
            <div
              style={{
                width: '100%',
                height: 60,
                borderRadius: 8,
                background: '#1A1916',
                border: '1px solid #2E2C28',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <div style={{ width: 40, height: 8, borderRadius: 4, background: '#F0EDE6' }} />
              <div style={{ width: 24, height: 8, borderRadius: 4, background: '#2E2C28' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#F0EDE6' }}>
              Dark
            </span>
            {theme === 'dark' && (
              <span
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  color: '#3B82F6',
                  marginTop: '0.25rem',
                }}
              >
                ✓ Active
              </span>
            )}
          </button>
        </div>

        {/* Quick toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Quick toggle:
          </span>
          <ThemeToggle />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Currently: <strong style={{ color: 'var(--text-primary)' }}>{theme}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────
export default function Settings() {
  const user = useStore((s) => s.user);

  const [activeSection, setActiveSection] = useState('profile');
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load habits on mount
  useEffect(() => {
    async function loadHabits() {
      setLoading(true);
      try {
        const { data } = await api.settings.getHabits();
        setHabits(data?.habits || data || []);
      } catch {
        // Non-critical — habits will be empty
      } finally {
        setLoading(false);
      }
    }
    loadHabits();
  }, []);

  async function handleAddHabit(name, category) {
    try {
      await api.settings.saveHabit({ name, category, is_active: true });
      // Refresh list
      const { data } = await api.settings.getHabits();
      setHabits(data?.habits || data || []);
      setNewHabitName('');
    } catch {
      // Silently fail — could add error toast here
    }
  }

  async function handleToggleHabit(habit) {
    const updated = { ...habit, is_active: !habit.is_active };
    // Optimistic update
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)));
    try {
      await api.settings.updateHabit(habit.id, { is_active: updated.is_active });
    } catch {
      // Revert on failure
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
    }
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', minHeight: '100%' }}>
      {/* Left sidebar — section tabs */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <h1 className="section-title">Settings</h1>
        {['profile', 'habits', 'theme'].map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`btn ${activeSection === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              marginBottom: '0.5rem',
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Right — section content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeSection === 'profile' && <ProfileSection user={user} />}
        {activeSection === 'habits' && (
          loading ? (
            <div>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 64, marginBottom: '0.75rem', borderRadius: 10 }}
                />
              ))}
            </div>
          ) : (
            <HabitsSection
              habits={habits}
              onAdd={handleAddHabit}
              onToggle={handleToggleHabit}
              newHabitName={newHabitName}
              setNewHabitName={setNewHabitName}
            />
          )
        )}
        {activeSection === 'theme' && <ThemeSection />}
      </div>
    </div>
  );
}
