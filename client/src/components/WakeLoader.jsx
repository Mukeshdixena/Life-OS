import { useState, useEffect, useRef } from 'react';

const STATUSES = [
  'Server waking from deep sleep…',
  'Brewing your timeline…',
  'Loading life modules…',
  'Calibrating the day ahead…',
  'Syncing memory banks…',
  'Initializing the OS…',
  'Warming neural pathways…',
  'Assembling your universe…',
  'Almost there…',
];

const API_BASE = import.meta.env.VITE_API_URL || 'https://life-os-hmge.onrender.com';
const POLL_MS = 3000;
const TIMEOUT_MS = 75_000;

export default function WakeLoader({ onReady }) {
  const [statusIdx, setStatusIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [fading, setFading] = useState(false);
  const startRef = useRef(Date.now());
  const pollRef = useRef(null);
  const doneRef = useRef(false);

  async function checkHealth() {
    if (doneRef.current) return true;
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        doneRef.current = true;
        clearInterval(pollRef.current);
        setFading(true);
        setTimeout(onReady, 700);
        return true;
      }
    } catch {}
    return false;
  }

  function startPolling() {
    doneRef.current = false;
    checkHealth().then((ok) => {
      if (ok) return;
      pollRef.current = setInterval(async () => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(secs);
        if (Date.now() - startRef.current > TIMEOUT_MS) {
          clearInterval(pollRef.current);
          setTimedOut(true);
          return;
        }
        await checkHealth();
      }, POLL_MS);
    });
  }

  useEffect(() => {
    startRef.current = Date.now();
    startPolling();

    const msgTimer = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUSES.length);
    }, 2800);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(msgTimer);
    };
  }, []);

  function handleRetry() {
    setTimedOut(false);
    setElapsed(0);
    startRef.current = Date.now();
    startPolling();
  }

  return (
    <div className={`wake-loader${fading ? ' wake-fading' : ''}`} role="status" aria-label="Loading Life OS">
      <div className="wake-grain" aria-hidden="true" />

      {/* Orbital ring animation */}
      <div className="wake-orbit-wrap" aria-hidden="true">
        <div className="wake-ring wake-ring-1">
          <span className="wake-orb" />
        </div>
        <div className="wake-ring wake-ring-2">
          <span className="wake-orb" />
          <span className="wake-orb wake-orb-alt" />
        </div>
        <div className="wake-ring wake-ring-3">
          <span className="wake-orb" />
        </div>
        <div className="wake-core">
          <div className="wake-core-pulse" />
        </div>
      </div>

      <div className="wake-content">
        <h1 className="wake-title">Life OS</h1>

        {!timedOut ? (
          <>
            <p key={statusIdx} className="wake-status">
              {STATUSES[statusIdx]}
            </p>
            <div className="wake-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            {elapsed >= 15 && (
              <p key="elapsed" className="wake-elapsed">
                {elapsed}s · free tier cold start
              </p>
            )}
          </>
        ) : (
          <div className="wake-timeout">
            <p className="wake-status">Server is taking longer than usual.</p>
            <button className="btn btn-primary" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
