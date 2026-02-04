import { useState, useEffect } from 'react';

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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

      if (!leaderboardRes.ok) {
        const errData = await leaderboardRes.json();
        console.warn('Leaderboard update failed:', errData);
        const errorDetail = errData.details ? ` (${errData.details})` : '';
        // Set error but do NOT throw, so the user can still see the analysis result
        setError(`Note: Analysis saved locally but leaderboard sync failed: ${errData.error || leaderboardRes.statusText}${errorDetail}`);
      } else {
        // Only refresh leaderboard if save succeeded
        const refreshRes = await fetch('/api/leaderboard');
        const freshLeaderboard = await refreshRes.json();
        if (Array.isArray(freshLeaderboard)) {
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
    }
  };

  const handleKeyDown = (e) => {
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

            <button type="button" onClick={handleSubmit} disabled={loading} className="analyze-btn">
              {loading ? 'Analyzing...' : 'Analyze Lap'}
            </button>
          </form>

        {error && <div className="error">{error}</div>}

          {result && (
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
          )}
        </section>

        <aside className="right-panel">
          <div className="leaderboard">
            <h2>🏆 Leaderboard</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Driver</th>
                  <th>Car</th>
                  <th>Time</th>
                  <th>Lvl</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className={entry.name === userName ? "highlight" : ""}>
                    <td>{entry.rank}</td>
                    <td>
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="driver-link">
                        {entry.name} 📹
                      </a>
                    </td>
                    <td>{entry.car}</td>
                    <td className="time-cell" data-tooltip={entry.mods}>{entry.time}</td>
                    <td>{entry.level}</td>
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
        
        /* Form Styling */
        .input-group { gap: 1.2rem; }
        .input-field { 
          padding: 1rem; 
          border: 1px solid #dfe6e9; 
          border-radius: 8px; 
          font-size: 1rem; 
          transition: all 0.2s ease;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .input-field:focus { 
          outline: none; 
          border-color: #ff3e00; 
          box-shadow: 0 0 0 3px rgba(255, 62, 0, 0.1); 
        }
        
        .mod-group { 
          border: 1px solid #dfe6e9; 
          border-radius: 12px; 
          padding: 1.5rem; 
          background: #fff;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .mod-group:hover { 
          border-color: #b2bec3;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
        }
        .mod-group legend { 
          padding: 0 0.8rem; 
          font-weight: 700; 
          color: #2d3436; 
          text-transform: uppercase; 
          font-size: 0.8rem; 
          letter-spacing: 1px;
        }
        
        .analyze-btn {
          padding: 1.2rem 2rem;
          background: linear-gradient(135deg, #2d3436 0%, #000000 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          transition: transform 0.1s ease, box-shadow 0.2s ease;
          width: 100%;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
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
        .result-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 6px;
          background: linear-gradient(90deg, #ff3e00, #ff7600);
        }
        
        .score-circle {
          width: 140px;
          height: 140px;
          background: #ff3e00;
          border: 4px solid #fff;
          box-shadow: 0 8px 25px rgba(255, 62, 0, 0.3);
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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
        .time-cell { font-family: 'Roboto Mono', monospace; font-weight: 600; color: #ff3e00; }

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
          .mods-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
