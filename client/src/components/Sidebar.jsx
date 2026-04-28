import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Home,
  Calendar,
  BarChart3,
  History,
  Settings,
  ClipboardList,
  Star,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/today',     icon: Home,          label: 'Today'     },
  { to: '/plan',      icon: ClipboardList, label: 'Plan'      },
  { to: '/review',    icon: Star,          label: 'Review'    },
  { to: '/dashboard', icon: BarChart3,     label: 'Dashboard' },
  { to: '/history',   icon: Calendar,      label: 'History'   },
  { to: '/settings',  icon: Settings,      label: 'Settings'  },
];

export default function Sidebar() {
  const user       = useStore((s) => s.user);
  const logout     = useStore((s) => s.logout);
  const theme      = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">Life OS</div>

      <div style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div style={{ padding: '0 1.5rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {user?.name}
        </div>
        <button
          className="btn btn-ghost"
          onClick={logout}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.5rem 0' }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </nav>
  );
}
