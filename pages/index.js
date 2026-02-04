import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [tire, setTire] = useState('');
  const [mods, setMods] = useState({
    engine: {
      Stock: true,
      Header: false,
      Exhaust: false,
      Intake: false,
      Cam: false,
      Supercharge: false,
      Turbocharged: false,
      'Upgraded Turbo': false,
    },
    ecu: {
      Stock: true,
      Tuned: false,
    },
    drivetrain: {
      Stock: true,
      'Aftermarket LSD 1.5 or 2 way': false,
    },
    suspension: {
      Stock: true,
      '1 Way Coilover': false,
      '2 Way Coilover': false,
      '3 Way Coilover': false,
    },
    aero: {
      Stock: true,
      'Front Splitter': false,
      'Front Splitter and Rear Wing': false,
    },
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Simulated Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const submitLockRef = useRef(false);

  // Load leaderboard from API on mount
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLeaderboard(data);
        }
      })
      .catch(err => console.error("Failed to load leaderboard:", err));
  }, []);

  // Lock body scroll when loading
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [loading]);

  const setSingleChoice = (category, choice) => {
    setMods(prev => {
      const nextCategory = {};
      for (const key of Object.keys(prev[category])) {
        nextCategory[key] = false;
      }
      nextCategory[choice] = true;
      return { ...prev, [category]: nextCategory };
    });
  };

  const toggleEngine = (choice) => {
    const boltOns = new Set(['Header', 'Exhaust', 'Intake', 'Cam']);
    const forcedInduction = new Set(['Supercharge', 'Turbocharged', 'Upgraded Turbo']);

    setMods(prev => {
      const nextEngine = { ...prev.engine };

      if (choice === 'Stock') {
        for (const key of Object.keys(nextEngine)) nextEngine[key] = false;
        nextEngine.Stock = true;
        return { ...prev, engine: nextEngine };
      }

      nextEngine.Stock = false;

      if (forcedInduction.has(choice)) {
        for (const key of forcedInduction) nextEngine[key] = false;
        nextEngine[choice] = !prev.engine[choice];
      } else if (boltOns.has(choice)) {
        nextEngine[choice] = !prev.engine[choice];
      }

      const anyNonStock = Object.entries(nextEngine).some(([k, v]) => k !== 'Stock' && v);
      if (!anyNonStock) nextEngine.Stock = true;

      return { ...prev, engine: nextEngine };
    });
  };

  const getSelectedKeys = (obj) => Object.entries(obj).filter(([, v]) => v).map(([k]) => k);

  const buildModsPayload = () => {
    const engineSelected = getSelectedKeys(mods.engine);
    const ecuSelected = getSelectedKeys(mods.ecu);
    const drivetrainSelected = getSelectedKeys(mods.drivetrain);
    const suspensionSelected = getSelectedKeys(mods.suspension);
    const aeroSelected = getSelectedKeys(mods.aero);

    const structuredMods = {
      engine: engineSelected.length ? engineSelected : ['Stock'],
      ecu: ecuSelected.length ? ecuSelected : ['Stock'],
      drivetrain: drivetrainSelected.length ? drivetrainSelected : ['Stock'],
      suspension: suspensionSelected.length ? suspensionSelected : ['Stock'],
      aero: aeroSelected.length ? aeroSelected : ['Stock'],
      tire: tire || '',
    };

    const engineText = [
      `Engine: ${structuredMods.engine.join(', ')}`,
      `ECU: ${structuredMods.ecu.join(', ')}`,
      `Drivetrain: ${structuredMods.drivetrain.join(', ')}`,
    ].join(' | ');

    const suspensionText = [
      `Suspension: ${structuredMods.suspension.join(', ')}`,
      structuredMods.tire ? `Tire: ${structuredMods.tire}` : '',
    ].filter(Boolean).join(' | ');

    const aeroText = `Aero: ${structuredMods.aero.join(', ')}`;

    return {
      structuredMods,
      engineMod: engineText,
      suspensionMod: suspensionText,
      aeroMod: aeroText,
    };
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (loading || submitLockRef.current) {
      return;
    }

    setError('');
    if (!carModel || !url) {
      setSetupOpen(true);
      setError('Open Run Setup and provide Car Model + YouTube link.');
      return;
    }

    submitLockRef.current = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    console.log('Submitting form...');
    setLoading(true);
    setProgress(10);
    setError('');
    setResult(null);

    // Simulate progress
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 10;
      });
    }, 800);

    try {
      console.log('Building payload...');
      const { structuredMods, engineMod, suspensionMod, aeroMod } = buildModsPayload();
      console.log('Payload built:', { engineMod });
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          carModel,
          engineMod,
          suspensionMod,
          aeroMod,
          mods: structuredMods,
          tire,
        }),
      });

      clearInterval(timer);
      setProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Post new entry to Sheets API
      const summary = Array.isArray(data.driving_feedback) 
        ? data.driving_feedback.join('\n') 
        : data.driving_feedback;

      const newEntry = {
        name: userName || data.channel_name || "Anonymous",
        car: carModel || data.car_model,
        time: data.estimated_lap_time,
        level: data.driver_level,
        url: url,
        mods: data.detected_mods
          ? data.detected_mods.join(', ')
          : [engineMod, suspensionMod, aeroMod].filter(Boolean).join(' | '),
        summary: summary || ''
      };

      const leaderboardRes = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });

      const savedData = await leaderboardRes.json();
      if (!leaderboardRes.ok) {
        const errData = savedData;
        console.warn('Leaderboard update failed:', errData);
        const errorDetail = errData.details ? ` (${errData.details})` : '';
        // Set error but do NOT throw, so the user can still see the analysis result
        setError(`Note: Analysis saved locally but leaderboard sync failed: ${errData.error || leaderboardRes.statusText}${errorDetail}`);
      } else {
        if (savedData && Array.isArray(savedData.leaderboard)) {
          setLeaderboard(savedData.leaderboard);
        }

        // Only refresh leaderboard if save succeeded
        const entryKey = `${(newEntry.name || '').trim()}|${(newEntry.car || '').trim()}`.toLowerCase();

        const fetchLeaderboard = async () => {
          const refreshRes = await fetch('/api/leaderboard', { cache: 'no-store' });
          const freshLeaderboard = await refreshRes.json();
          return Array.isArray(freshLeaderboard) ? freshLeaderboard : null;
        };

        let freshLeaderboard = await fetchLeaderboard();

        // Sheets append can be eventually consistent; retry once if our entry is not reflected
        if (freshLeaderboard) {
          const hasEntry = freshLeaderboard.some(
            (e) => `${(e.name || '').trim()}|${(e.car || '').trim()}`.toLowerCase() == entryKey && e.time == newEntry.time,
          );
          if (!hasEntry) {
            await sleep(800);
            freshLeaderboard = await fetchLeaderboard();
          }
        }

        if (!savedData?.leaderboard && freshLeaderboard) {
          setLeaderboard(freshLeaderboard);
        }
      }

    } catch (err) {
      console.error('Submit error:', err);
      clearInterval(timer);
      setError(err.message);
    } finally {
      setLoading(false);
      // Reset progress after a short delay so user sees 100%
      setTimeout(() => setProgress(0), 1000);
      submitLockRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (loading || submitLockRef.current) {
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={`container ${loading ? 'locked' : ''}`}>
      {loading && (
        <div className="loading-overlay" role="status" aria-busy="true">
          <div className="spinner-container">
            <div className="spinner"></div>
            <p>Analyzing lap telemetry...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1>Track Junkies 🏁</h1>
        <p>AI-Powered Lap Time Estimator (Buttonwillow 13CW)</p>
      </header>

      <main className="main-grid" aria-busy={loading} aria-disabled={loading}>
        <section className="left-panel">
          {error && <div className="error">{error}</div>}

          <div className="result-area">
            {loading ? (
              <div className="result-card loading">
                <h2>Analyzing Lap...</h2>
                <p className="empty-text">Estimating lap time and driver score. This may take a moment.</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : result ? (
              <div className="result-card fade-in">
              <div className="score-header">
                <h2>Driver Score</h2>
                <div className="score-circle">
                  <span className="score-value">{result.driver_level}</span>
                  <span className="score-max">/100</span>
                </div>
              </div>

              <div className="feedback-section">
                <h3>AI Coach Feedback</h3>
                {Array.isArray(result.driving_feedback) ? (
                  <ul className="feedback-list">
                    {result.driving_feedback.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{result.driving_feedback}</p>
                )}
              </div>
            </div>
            ) : (
              <div className="result-card empty">
                <h2>Driver Score</h2>
                <p className="empty-text">Run an analysis to see your driver score and coaching feedback.</p>
              </div>
            )}
          </div>

          <div className="cta-row">
            <button type="button" onClick={handleSubmit} disabled={loading} className="analyze-btn">
              {loading ? 'Analyzing...' : 'Analyze Lap'}
            </button>
            <button type="button" onClick={() => setSetupOpen((v) => !v)} disabled={loading} className="setup-btn">
              {setupOpen ? 'Hide Setup' : 'Edit Run Setup'}
            </button>
          </div>

          <details className="setup" open={setupOpen} onToggle={(e) => setSetupOpen(e.currentTarget.open)}>
            <summary>
              <span className="setup-title">Run Setup</span>
              <span className="setup-meta">
                {carModel ? carModel : 'Car'}{tire ? ` • ${tire}` : ''}{url ? ' • Link set' : ''}
              </span>
            </summary>
            <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown} className="input-group">
            <input
              type="text"
              placeholder="Driver Name (e.g. The Stig)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="input-field"
              disabled={loading}
            />
            <input
              type="text"
              placeholder="Car Model (e.g. S2000, M3)"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              required
              className="input-field"
              disabled={loading}
            />

            <input
              type="text"
              placeholder="Paste YouTube Link (e.g., https://youtu.be/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="input-field url-input"
              disabled={loading}
            />

            <input
              type="text"
              placeholder="Tire (e.g. RE-71RS, A052)"
              value={tire}
              onChange={(e) => setTire(e.target.value)}
              className="input-field"
              disabled={loading}
            />

            <fieldset className="mod-group" disabled={loading}>
              <legend>Engine</legend>
              <div className="mods-grid">
                {Object.keys(mods.engine).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.engine[label]}
                      onChange={() => toggleEngine(label)}
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group" disabled={loading}>
              <legend>ECU</legend>
              <div className="mods-grid">
                {Object.keys(mods.ecu).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.ecu[label]}
                      onChange={() => setSingleChoice('ecu', label)}
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group" disabled={loading}>
              <legend>Drivetrain</legend>
              <div className="mods-grid">
                {Object.keys(mods.drivetrain).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.drivetrain[label]}
                      onChange={() => setSingleChoice('drivetrain', label)}
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group" disabled={loading}>
              <legend>Suspension</legend>
              <div className="mods-grid">
                {Object.keys(mods.suspension).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.suspension[label]}
                      onChange={() => setSingleChoice('suspension', label)}
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group" disabled={loading}>
              <legend>Aero</legend>
              <div className="mods-grid">
                {Object.keys(mods.aero).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.aero[label]}
                      onChange={() => setSingleChoice('aero', label)}
                      disabled={loading}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>


            <button type="button" onClick={handleSubmit} disabled={loading} className="analyze-btn secondary">
              {loading ? 'Analyzing...' : 'Analyze Lap'}
            </button>
          </form>
          </details>
        </section>

        <aside className="right-panel">
          <div className="leaderboard">
            <h2>🏆 Leaderboard</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                    <th>Time</th>
                    <th>Driver</th>
                    <th>Score</th>
                    <th>Video</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className={entry.name === userName ? 'highlight' : ''}>
                    <td>{entry.rank}</td>
                    <td className="time-cell" data-tooltip={entry.mods}>{entry.time}</td>
                    <td className="driver-cell">
                      <div className="driver-name">{entry.name}</div>
                      <div className="driver-car">{entry.car}</div>
                    </td>
                    <td className="score-cell">{entry.level}</td>
                    <td>
                      {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer" className="video-link">
                          YouTube
                        </a>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </main>

      <style jsx>{`
        /* Visual Redesign Variables */
        :global(body) {
          background-color: #f5f7fa;
          background-image: radial-gradient(#e1e4e8 1px, transparent 1px);
          background-size: 20px 20px;
          color: #2d3436;
        }

        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 2rem; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        header { 
          text-align: center; 
          margin-bottom: 3rem; 
          padding-bottom: 2rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        
        h1 { 
          margin: 0; 
          color: #2d3436; 
          font-weight: 800; 
          letter-spacing: -1px; 
          font-size: 2.5rem;
        }
        h1 span { color: #ff3e00; }
        
        p { color: #636e72; font-size: 1.1rem; }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(440px, 1fr) minmax(560px, 1.35fr);
          gap: 2rem;
          align-items: start;
        }

        .left-panel { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
        .right-panel { position: sticky; top: 1.5rem; align-self: start; }

        .result-area { display: flex; flex-direction: column; gap: 1rem; }

        .cta-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.75rem;
          align-items: center;
        }

        .setup-btn {
          padding: 1.1rem 1.25rem;
          border-radius: 8px;
          border: 1px solid #dfe6e9;
          background: #fff;
          font-weight: 800;
          color: #2d3436;
          cursor: pointer;
        }
        .setup-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .setup {
          background: #fff;
          border: 1px solid #dfe6e9;
          border-radius: 12px;
          overflow: hidden;
        }
        .setup summary {
          list-style: none;
          cursor: pointer;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          user-select: none;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .setup summary::-webkit-details-marker { display: none; }
        .setup-title { font-weight: 900; color: #2d3436; }
        .setup-meta { color: #636e72; font-size: 0.95rem; }

        .input-group { display: flex; flex-direction: column; gap: 1rem; padding: 1rem 1.25rem 1.25rem; }
        .input-field {
          width: 100%;
          padding: 1rem 1.1rem;
          border: 1px solid #dfe6e9;
          border-radius: 10px;
          font-size: 1.05rem;
          background: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .input-field:focus {
          outline: none;
          border-color: #ff3e00;
          box-shadow: 0 0 0 4px rgba(255, 62, 0, 0.12);
        }
        .url-input { border-color: rgba(255, 62, 0, 0.6); }

        .analyze-btn.secondary {
          padding: 1rem 1.25rem;
          font-size: 1rem;
          font-weight: 900;
          border-radius: 10px;
        }

        /* Form Styling */
        
        .mod-group { 
          border: 1px solid #dfe6e9; 
          border-radius: 8px; /* Slightly tighter radius */
          padding: 0.8rem 1rem; /* Compact padding */
          background: #fff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .mod-group legend { 
          padding: 0 0.5rem; 
          font-weight: 700; 
          color: #636e72; /* Softer legend color */
          font-size: 0.75rem; 
          letter-spacing: 0.5px;
        }
        .mods-grid { 
          display: grid; 
          grid-template-columns: repeat(3, minmax(0, 1fr)); /* 3 Columns for compactness */
          gap: 0.5rem; /* Tighter gap */
        }
        .mod-option { 
          display: flex; 
          gap: 0.4rem; 
          align-items: center; 
          font-size: 0.85rem; /* Smaller text */
          white-space: nowrap; /* Prevent wrapping */
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .analyze-btn {
          padding: 1.2rem 2rem;
          background: linear-gradient(135deg, #ff3e00 0%, #d63000 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          width: 100%;
          box-shadow: 0 4px 15px rgba(255, 62, 0, 0.4);
          transition: all 0.2s ease;
        }
        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 62, 0, 0.6);
          filter: brightness(1.1);
        }
        .analyze-btn:active:not(:disabled) { transform: translateY(1px); }

        /* Locked / Loading */
        .loading-overlay {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease;
        }
        .spinner {
          border-width: 3px;
          border-color: #eee;
          border-top-color: #ff3e00;
        }
        
        /* Results */
        .result-card {
          border: none;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          padding: 3rem 2rem;
          overflow: hidden;
          position: relative;
        }
        .result-card.loading {
          border: 1px dashed rgba(255, 62, 0, 0.4);
          background: #fff7f2;
        }
        .result-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 6px;
          background: linear-gradient(90deg, #ff3e00, #ff7600);
        }
        
        .score-circle {
          width: 140px;
          height: 140px;
          background: #fff; /* White center */
          border: 8px solid #ff3e00; /* Thick ring */
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .score-value { 
          color: #2d3436;
          font-size: 3.5rem; 
          font-weight: 800; 
          line-height: 1; 
        }
        .score-max { 
          color: #b2bec3;
          font-size: 1rem; 
          font-weight: 600; 
        }
        
        .feedback-section h3 { 
          color: #2d3436; 
          font-size: 1.4rem; 
          margin-bottom: 1.5rem;
          border-color: #ff3e00;
        }
        .feedback-list li {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 8px;
          border-left: 3px solid #ff3e00;
          margin-bottom: 1rem;
          font-size: 1.05rem;
        }

        /* Leaderboard */
        .leaderboard {
          background: #fff;
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .leaderboard h2 {
          background: #2d3436;
          color: #fff;
          margin: 0;
          padding: 1.5rem;
          font-size: 1.2rem;
          letter-spacing: 0.5px;
          border: none;
        }
        table { font-size: 0.95rem; }
        th { background: #f1f2f6; color: #636e72; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        tr:hover { background-color: #fafafa; }
        .highlight { background-color: #fff3e0 !important; transition: background 0.5s ease; }
        .driver-link { font-weight: 500; color: #2d3436; }
        .time-cell { position: relative; cursor: help; border-bottom: 1px dashed rgba(255, 62, 0, 0.45); font-family: 'Roboto Mono', monospace; font-weight: 700; color: #ff3e00; }

        .driver-cell { max-width: 240px; }
        .driver-name { font-weight: 800; color: #2d3436; }
        .driver-car { font-size: 0.85rem; color: #636e72; margin-top: 0.15rem; }
        .score-cell { font-weight: 800; color: #2d3436; }
        .video-link { font-weight: 800; color: #ff3e00; text-decoration: none; }
        .video-link:hover { text-decoration: underline; }
        .muted { color: #b2bec3; }

        @media (prefers-reduced-motion: reduce) {
          .mod-group, .analyze-btn, .result-card, .score-circle, .loading-overlay {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
        .time-cell:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          padding: 0.5rem;
          border-radius: 4px;
          white-space: nowrap;
          z-index: 10;
          font-size: 0.8rem;
          pointer-events: none;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 768px) {
          .main-grid { grid-template-columns: 1fr; }
          .right-panel { position: static; }
          .mods-grid { grid-template-columns: repeat(2, 1fr); } /* 2 cols on mobile */
        }
      `}</style>
    </div>
  );
}
