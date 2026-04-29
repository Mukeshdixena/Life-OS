import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Home, CalendarPlus, CheckSquare, BarChart3, Clock, Settings,
  Sun, Moon,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/today',     Icon: Home,          label: 'Today'     },
  { to: '/plan',      Icon: CalendarPlus,  label: 'Plan'      },
  { to: '/review',    Icon: CheckSquare,   label: 'Review'    },
  { to: '/dashboard', Icon: BarChart3,     label: 'Dashboard' },
  { to: '/history',   Icon: Clock,         label: 'History'   },
  { to: '/settings',  Icon: Settings,      label: 'Settings'  },
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

  const firstName = user?.name?.split(' ')[0] || 'You';
  const avatarInitials = initials(user?.name || '');

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark" />
        <div className="brand-name-wrap">
          <div className="brand-name">Life OS</div>
        </div>
        <div className="brand-dot" />
      </div>

      {/* Nav */}
      <nav className="nav" style={{ flex: 1 }}>
        {NAV_ITEMS.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-foot">
        {/* User row */}
        <div className="user-row" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
          <div className="avatar">{avatarInitials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="user-name">{firstName}</div>
            <div className="user-sub" onClick={(e) => { e.stopPropagation(); logout(); }} style={{ cursor: 'pointer' }}>
              Sign out
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="theme-toggle">
          <div className="pill-slide" />
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => theme !== 'light' && toggleTheme()}
          >
            <Sun size={12} /> Light
          </button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => theme !== 'dark' && toggleTheme()}
          >
            <Moon size={12} /> Dark
          </button>
        </div>
      </div>
    </aside>
  );
}
