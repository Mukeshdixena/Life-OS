import { Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from './Sidebar';
import CheckInModal from './CheckInModal';
import { useLiveClock } from '../hooks/useLiveClock';

const CRUMBS = {
  '/today':     'HOME / TODAY',
  '/plan':      'HOME / PLAN',
  '/review':    'HOME / REVIEW',
  '/dashboard': 'HOME / DASHBOARD',
  '/history':   'HOME / HISTORY',
  '/settings':  'HOME / SETTINGS',
};

function pad2(n) { return String(n).padStart(2, '0'); }

function fmtClock(d) {
  let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = ((h + 11) % 12) + 1;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)} ${ap}`;
}

const DAY_NAMES  = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MON_NAMES  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export default function Layout() {
  const location = useLocation();
  const { now }  = useLiveClock();
  const showCheckinModal = useStore((s) => s.showCheckinModal);

  const crumb = CRUMBS[location.pathname] || 'HOME';
  const clock = `${fmtClock(now)} · ${DAY_NAMES[now.getDay()]} ${MON_NAMES[now.getMonth()]} ${now.getDate()}`;

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main-area">
        <div className="top-bar">
          <span className="crumbs">{crumb}</span>
          <span className="clock">{clock}</span>
        </div>

        <div className="main-scroll">
          <Outlet />
        </div>
      </div>

      {showCheckinModal && <CheckInModal />}
    </div>
  );
}
