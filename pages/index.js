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

  // Removed localStorage sync since we now use the API

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

      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
      
      // Reload leaderboard to get fresh sort from backend
      const refreshRes = await fetch('/api/leaderboard');
      const freshLeaderboard = await refreshRes.json();
      if (Array.isArray(freshLeaderboard)) {
        setLeaderboard(freshLeaderboard);
      } else {
        console.warn('Leaderboard refresh did not return an array:', freshLeaderboard);
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
    <div className="container">
      <header>
        <h1>Track Junkies 🏁</h1>
        <p>AI-Powered Lap Time Estimator (Buttonwillow 13CW)</p>
      </header>

      <main className="main-grid">
        <section className="left-panel">
          <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown} className="input-group">
            <input
              type="text"
              placeholder="Driver Name (e.g. The Stig)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Car Model (e.g. S2000, M3)"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
              required
              className="input-field"
            />

            <input
              type="text"
              placeholder="Paste YouTube Link (e.g., https://youtu.be/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="input-field url-input"
            />

            <input
              type="text"
              placeholder="Tire (e.g. RE-71RS, A052)"
              value={tire}
              onChange={(e) => setTire(e.target.value)}
              className="input-field"
            />

            <fieldset className="mod-group">
              <legend>Engine</legend>
              <div className="mods-grid">
                {Object.keys(mods.engine).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.engine[label]}
                      onChange={() => toggleEngine(label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group">
              <legend>ECU</legend>
              <div className="mods-grid">
                {Object.keys(mods.ecu).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.ecu[label]}
                      onChange={() => setSingleChoice('ecu', label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group">
              <legend>Drivetrain</legend>
              <div className="mods-grid">
                {Object.keys(mods.drivetrain).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.drivetrain[label]}
                      onChange={() => setSingleChoice('drivetrain', label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group">
              <legend>Suspension</legend>
              <div className="mods-grid">
                {Object.keys(mods.suspension).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.suspension[label]}
                      onChange={() => setSingleChoice('suspension', label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mod-group">
              <legend>Aero</legend>
              <div className="mods-grid">
                {Object.keys(mods.aero).map((label) => (
                  <label key={label} className="mod-option">
                    <input
                      type="checkbox"
                      checked={mods.aero[label]}
                      onChange={() => setSingleChoice('aero', label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="button" onClick={handleSubmit} disabled={loading} className="analyze-btn">
              {loading ? (
                <div className="progress-container">
                  <span>Analyzing... {progress}%</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                'Analyze Lap'
              )}
            </button>
          </form>

        {error && <div className="error">{error}</div>}

          {result && (
            <div className="result-card">
              <h2>Estimated Lap: {result.estimated_lap_time}</h2>
              <div className="confidence-badge">Confidence: {result.confidence}</div>
              
              <div className="grid">
                <div className="section">
                  <h3>Timestamps</h3>
                  <p>Start: {result.timestamps?.lap_start}</p>
                  <p>End: {result.timestamps?.lap_end}</p>
                  <p className="reasoning">{result.reasoning_timing}</p>
                </div>
                
                <div className="section">
                  <h3>Car & Mods</h3>
                  <p><strong>Model:</strong> {result.car_model}</p>
                  {Array.isArray(result.detected_mods) && result.detected_mods.length > 0 ? (
                    <ul>
                      {result.detected_mods.map((mod, i) => <li key={i}>{mod}</li>)}
                    </ul>
                  ) : null}
                </div>
              </div>

              <div className="section feedback">
                <h3>Driving Analysis (Score: {result.driver_level}/100)</h3>
                {Array.isArray(result.driving_feedback) ? (
                  <ul>
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
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; }
        header { text-align: center; margin-bottom: 3rem; }
        h1 { margin: 0; color: #ff3e00; }
        
        .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 3rem; align-items: start; }
        
        /* Left Panel */
        .input-group { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
        .input-field { padding: 0.8rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; width: 100%; box-sizing: border-box; }
        .url-input { border-color: #ff3e00; }

        .mod-group { border: 1px solid #eee; border-radius: 8px; padding: 1rem; }
        .mod-group legend { padding: 0 0.5rem; font-weight: 600; color: #666; }
        .mods-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
        .mod-option { display: flex; gap: 0.5rem; align-items: center; font-size: 0.95rem; }
        button { padding: 1rem 1.5rem; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1.1rem; align-self: center; width: 50%; }
        button:disabled { opacity: 0.8; cursor: not-allowed; }
        
        .progress-container { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .progress-bar { width: 100%; height: 6px; background: #444; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: #00e676; transition: width 0.3s ease; }
        
        .error { color: red; padding: 1rem; background: #fff0f0; border-radius: 4px; }
        .result-card { border: 1px solid #eee; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0; }
        .confidence-badge { display: inline-block; padding: 0.2rem 0.6rem; background: #e0f7fa; color: #006064; border-radius: 12px; font-size: 0.85rem; }
        .reasoning { font-style: italic; color: #666; font-size: 0.9rem; }
        .feedback { background: #f9f9f9; padding: 1rem; border-left: 4px solid #ff3e00; }

        /* Right Panel (Leaderboard) */
        .leaderboard { background: #f4f4f4; padding: 1.5rem; border-radius: 8px; }
        .leaderboard h2 { margin-top: 0; font-size: 1.5rem; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th, td { padding: 0.8rem; text-align: left; border-bottom: 1px solid #ddd; }
        th { color: #666; font-weight: 600; }
        tr:last-child td { border-bottom: none; }
        .highlight { background: #fff8e1; font-weight: bold; }
        
        .driver-link { text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.3rem; }
        .driver-link:hover { text-decoration: underline; color: #ff3e00; }
        
        /* Tooltip for Mods */
        .time-cell { position: relative; cursor: help; border-bottom: 1px dashed #999; }
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
