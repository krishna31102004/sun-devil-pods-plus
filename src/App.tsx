import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import SignUp from './pages/SignUp';
import PodDashboard from './pages/PodDashboard';
import Store from './pages/Store';
import CaptainConsole from './pages/CaptainConsole';

interface SessionState {
  currentUserId: string | null;
  isCaptain: boolean;
  points: number;
  displayName: string | null;
}

const readSession = (): SessionState => {
  if (typeof window === 'undefined') {
    return { currentUserId: null, isCaptain: false, points: 0, displayName: null };
  }
  const currentUserId = localStorage.getItem('currentUserId');
  const isCaptain = localStorage.getItem('isCaptain') === 'true';
  const displayName = localStorage.getItem('currentUserName');
  const storedPoints = localStorage.getItem('points');
  const points = storedPoints ? parseInt(storedPoints, 10) || 0 : 0;
  return { currentUserId, isCaptain, points, displayName };
};

/**
 * Root component for routing. At present we define two routes:
 * the sign‑up page at the root path and the dashboard page. As
 * the prototype evolves you may add additional routes (e.g.
 * separate components for the wallet/store or belonging pulse).
 */
const App: React.FC = () => {
  const location = useLocation();
  const [session, setSession] = useState<SessionState>(() => readSession());

  useEffect(() => {
    const handleStorage = () => setSession(readSession());
    const handlePointsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      setSession((prev) => ({ ...prev, points: typeof detail === 'number' ? detail : readSession().points }));
    };
    const handleSessionUpdated = () => setSession(readSession());

    window.addEventListener('storage', handleStorage);
    window.addEventListener('pods:points-updated', handlePointsUpdated as EventListener);
    window.addEventListener('pods:session-updated', handleSessionUpdated);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('pods:points-updated', handlePointsUpdated as EventListener);
      window.removeEventListener('pods:session-updated', handleSessionUpdated);
    };
  }, []);

  const navLinks = useMemo(() => [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/store', label: 'Store' },
  ], []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-white/40">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-asuMaroon font-extrabold text-xl">
            <span aria-hidden>☀️</span>
            <span>SunDevil Pods+</span>
          </NavLink>
          <div className="flex items-center gap-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-asuMaroon text-white shadow-sm' : 'text-asuMaroon/80 hover:bg-asuMaroon/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {session.isCaptain && (
              <NavLink
                to="/captain"
                className={({ isActive }) =>
                  `text-sm font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-asuGold text-black shadow-sm' : 'text-asuMaroon/80 hover:bg-asuGold/30'
                  }`
                }
              >
                Captain
              </NavLink>
            )}
            <div className="flex items-center gap-2 bg-asuMaroon text-white text-sm font-semibold px-3 py-1 rounded-full shadow">
              <span>{session.points}</span>
              <span className="uppercase tracking-wide text-xs">pts</span>
            </div>
          </div>
        </nav>
      </header>
      <main className="py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <Routes location={location}>
            <Route path="/" element={<SignUp />} />
            <Route path="/dashboard" element={<PodDashboard />} />
            <Route path="/store" element={<Store />} />
            <Route path="/captain" element={<CaptainConsole />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
