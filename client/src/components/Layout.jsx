import { Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from './Sidebar';
import CheckInModal from './CheckInModal';

export default function Layout() {
  const showCheckinModal = useStore((s) => s.showCheckinModal);

  return (
    <div className="app-shell-v2">
      <Sidebar />
      <main className="main-content-v2">
        <div className="main-scroll-v2">
          <Outlet />
        </div>
      </main>
      {showCheckinModal && <CheckInModal />}
    </div>
  );
}
