import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Home, CheckSquare, BarChart3, Clock, Settings, Sun, Moon, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/today',     Icon: Home,        label: 'Today'     },
  { to: '/review',    Icon: CheckSquare, label: 'Review'    },
  { to: '/dashboard', Icon: BarChart3,   label: 'Dashboard' },
  { to: '/history',   Icon: Clock,       label: 'History'   },
  { to: '/settings',  Icon: Settings,    label: 'Settings'  },
];

function initials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

export default function Sidebar() {
  const user        = useStore((s) => s.user);
  const theme       = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const logout      = useStore((s) => s.logout);
  const navigate    = useNavigate();

  const firstName      = user?.name?.split(' ')[0] || 'You';
  const avatarInitials = initials(user?.name || '');

  return (
    <header className="top-nav">
      {/* Brand */}
      <div className="top-nav-brand" onClick={() => navigate('/today')}>
        <div className="brand-mark" />
        <span className="brand-name">Life OS</span>
      </div>

      {/* Nav links */}
      <nav className="top-nav-links">
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `top-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Right controls */}
      <div className="top-nav-right">
        <button
          id="theme-toggle-btn"
          className="top-nav-icon-btn"
          title="Toggle theme"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="top-nav-avatar" title={firstName} onClick={() => navigate('/settings')}>
          {avatarInitials}
        </div>

        <button
          className="top-nav-icon-btn"
          title="Sign out"
          onClick={logout}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
