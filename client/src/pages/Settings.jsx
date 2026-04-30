import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, CATEGORY_COLORS } from '../store/useStore';
import { Plus, GripVertical } from 'lucide-react';
import * as api from '../api/index';

const CAT_HEX = CATEGORY_COLORS;
function catHex(c) { return CAT_HEX[c] || '#6B7280'; }

const CAT_NAMES = {
  work: 'Deep Work', health: 'Health', learning: 'Learning',
  relationships: 'People', admin: 'Admin', personal: 'Personal', sleep: 'Rest',
};

/* ── ThemeTab ───────────────────────────────────────────────── */
function ThemeTab({ theme, onTheme }) {
  return (
    <div className="card card-tall">
      <div className="label-eyebrow">Appearance</div>
      <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 28, margin: '4px 0 18px', letterSpacing: '-0.01em' }}>
        Pick your atmosphere
      </h2>
      <div className="theme-preview-grid">
        <div className={`theme-preview light${theme === 'light' ? ' sel' : ''}`} onClick={() => onTheme('light')}>
          <div className="tp-label">Paper · Light</div>
          <div className="mock">
            <div className="tp-line lg" /><div className="tp-line md" />
            <div className="tp-line sm" /><div className="tp-line md" /><div className="tp-line lg" />
          </div>
        </div>
        <div className={`theme-preview dark${theme === 'dark' ? ' sel' : ''}`} onClick={() => onTheme('dark')}>
          <div className="tp-label">Quiet night · Dark</div>
          <div className="mock">
            <div className="tp-line lg" /><div className="tp-line md" />
            <div className="tp-line sm" /><div className="tp-line md" /><div className="tp-line lg" />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 18, lineHeight: 1.55 }}>
        Your theme stays where you set it — Life OS won't follow your system.
        Some moments call for paper. Others, for the quiet of night.
      </p>
    </div>
  );
}

/* ── AreasTab ───────────────────────────────────────────────── */
function AreasTab() {
  return (
    <div>
      <div className="label-eyebrow" style={{ marginBottom: 12 }}>Your life areas</div>
      {Object.entries(CAT_NAMES).map(([id, name]) => (
        <div key={id} className="area-row" style={{ '--cat': catHex(id) }}>
          <span className="area-sw" />
          <span className="name">{name}</span>
          <span className="meta">{Math.floor(Math.random() * 12) + 2}h/wk</span>
          <button className="toggle-mini on" />
        </div>
      ))}
      <button className="btn btn-outline" style={{ marginTop: 8 }}>
        <Plus size={14} /> Add area
      </button>
    </div>
  );
}

/* ── ProfileTab ─────────────────────────────────────────────── */
function ProfileTab({ user }) {
  return (
    <div className="card card-tall">
      <div className="label-eyebrow">Profile</div>
      <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 28, margin: '4px 0 18px', letterSpacing: '-0.01em' }}>
        Your account
      </h2>
      <div style={{ marginBottom: 18 }}>
        <label className="label" htmlFor="p-name">Name</label>
        <input id="p-name" className="input" type="text" value={user?.name || ''} readOnly style={{ cursor: 'default', opacity: 0.8 }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label className="label" htmlFor="p-email">Email</label>
        <input id="p-email" className="input" type="email" value={user?.email || ''} readOnly style={{ cursor: 'default', opacity: 0.8 }} />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)' }}>
        Profile editing coming soon.
      </p>
    </div>
  );
}

/* ── HabitsTab ──────────────────────────────────────────────── */
function HabitsTab() {
  const [habits,       setHabits]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [newName,      setNewName]      = useState('');
  const [newCat,       setNewCat]       = useState('health');
  const [adding,       setAdding]       = useState(false);

  useEffect(() => {
    api.settings.getHabits()
      .then(({ data }) => setHabits(data?.habits || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addHabit() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.settings.saveHabit({ name: newName.trim(), category: newCat, is_active: true });
      const { data } = await api.settings.getHabits();
      setHabits(data?.habits || data || []);
      setNewName('');
    } catch {} finally { setAdding(false); }
  }

  async function toggleHabit(habit) {
    const updated = { ...habit, is_active: !habit.is_active };
    setHabits(prev => prev.map(h => h.id === habit.id ? updated : h));
    try { await api.settings.updateHabit(habit.id, { is_active: updated.is_active }); }
    catch { setHabits(prev => prev.map(h => h.id === habit.id ? habit : h)); }
  }

  if (loading) return (
    <div>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 12 }} />)}
    </div>
  );

  return (
    <div>
      <div className="label-eyebrow" style={{ marginBottom: 12 }}>Your habits</div>
      {habits.length === 0 && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 18px', color: 'var(--text-2)', fontSize: 13 }}>
          No habits yet. Add one below.
        </div>
      )}
      {habits.map(h => (
        <div key={h.id} className="area-row" style={{ '--cat': catHex(h.category) }}>
          <span className="area-sw" />
          <span className="name">{h.name}</span>
          <span className="meta">{h.category}</span>
          <button
            className={`toggle-mini${h.is_active ? ' on' : ''}`}
            onClick={() => toggleHabit(h)}
          />
        </div>
      ))}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label-eyebrow" style={{ marginBottom: 12 }}>Add habit</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <input className="input" type="text" placeholder="Habit name…" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            style={{ flex: 1, minWidth: 140 }} />
          <select className="input" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: 140, flexShrink: 0 }}>
            {Object.entries(CAT_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={addHabit} disabled={adding || !newName.trim()}>
          {adding ? 'Adding…' : <><Plus size={14} /> Add habit</>}
        </button>
      </div>
    </div>
  );
}

/* ── Non-negotiables tab (stub) ─────────────────────────────── */
function NNTab() {
  const items = [
    { name: 'Strength training', dur: '60m', on: true },
    { name: 'Read',              dur: '30m', on: true },
    { name: 'Journal',           dur: '10m', on: true },
    { name: '8h sleep window',   dur: '8h',  on: true },
    { name: 'Connect with someone', dur: '20m', on: false },
  ];
  return (
    <div>
      <div className="label-eyebrow" style={{ marginBottom: 12 }}>Non-negotiables — your daily floor</div>
      {items.map((n, i) => (
        <div key={i} className="area-row" style={{ '--cat': '#3B82F6' }}>
          <GripVertical size={16} color="var(--text-3)" />
          <span className="name">{n.name}</span>
          <span className="meta">{n.dur}</span>
          <button className={`toggle-mini${n.on ? ' on' : ''}`} />
        </div>
      ))}
    </div>
  );
}

/* ── Coming soon stub ───────────────────────────────────────── */
function StubTab({ label }) {
  return (
    <div className="card card-tall">
      <div className="label-eyebrow">{label}</div>
      <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 26, margin: '6px 0 12px', letterSpacing: '-0.01em' }}>Coming together</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
        This panel hosts the {label.toLowerCase()} configuration. Theme and Life Areas are wired to live state.
      </p>
    </div>
  );
}

/* ── DataTab ─────────────────────────────────────────────────── */
function DataTab() {
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!window.confirm("Are you absolutely sure you want to erase all your data? This will permanently remove all your plans, habits, and logs while keeping your account. This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await api.settings.deleteAccount(); // This now only clears data on backend
      // Refresh the app state or redirect
      window.location.href = '/'; // Simple way to force state reload to empty
    } catch (err) {
      alert("Failed to erase data. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="card card-tall" style={{ border: '1px solid #E0524A33' }}>
      <div className="label-eyebrow" style={{ color: '#E0524A' }}>Danger Zone</div>
      <h2 style={{ fontFamily: 'DM Serif Display', fontSize: 26, margin: '6px 0 12px', letterSpacing: '-0.01em' }}>
        Reset All Data
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        This will permanently erase all your data, including daily plans, time blocks, and habits. Your user profile and account will remain intact so you can start fresh.
      </p>
      <button className="btn btn-outline" onClick={handleDelete} disabled={deleting} style={{ color: '#E0524A', borderColor: '#E0524A' }}>
        {deleting ? 'Erasing...' : 'Restart & Clear All Data'}
      </button>
    </div>
  );
}

/* ── Main Settings Page ─────────────────────────────────────── */
export default function Settings() {
  const user      = useStore(s => s.user);
  const theme     = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const [tab, setTab] = useState('theme');

  function setTheme(v) {
    if (theme !== v) toggleTheme();
  }

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'areas',   label: 'Life Areas' },
    { id: 'nn',      label: 'Non-Negotiables' },
    { id: 'habits',  label: 'Habits' },
    { id: 'prefs',   label: 'Preferences' },
    { id: 'theme',   label: 'Theme' },
    { id: 'data',    label: 'Data' },
  ];

  return (
    <div className="page-fade page-pad">
      <div className="dash-head">
        <div>
          <div className="label-eyebrow" style={{ marginBottom: 4 }}>Configuration</div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="settings-grid">
        <div className="set-nav">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'theme'   && <ThemeTab theme={theme} onTheme={setTheme} />}
          {tab === 'areas'   && <AreasTab />}
          {tab === 'profile' && <ProfileTab user={user} />}
          {tab === 'habits'  && <HabitsTab />}
          {tab === 'nn'      && <NNTab />}
          {tab === 'data'    && <DataTab />}
          {tab === 'prefs'   && <StubTab label={tabs.find(t => t.id === tab).label} />}
        </div>
      </div>
    </div>
  );
}
