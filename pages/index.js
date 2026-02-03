import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [carModel, setCarModel] = useState('');
  const [engineMod, setEngineMod] = useState('');
  const [suspensionMod, setSuspensionMod] = useState('');
  const [aeroMod, setAeroMod] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Simulated Leaderboard State
  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: "Stig", car: "Porsche GT3 RS", time: "1:48.2", level: 10, url: "https://youtu.be/example1", mods: "Stock" },
    { rank: 2, name: "Keiichi", car: "Toyota AE86", time: "1:55.4", level: 9, url: "https://youtu.be/example2", mods: "TRD Suspension, ITBs" },
    { rank: 3, name: "Randy", car: "Subaru WRX", time: "1:58.1", level: 8, url: "https://youtu.be/example3", mods: "Coilovers, Tune" },
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, carModel, engineMod, suspensionMod, aeroMod }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      
      setResult(data);

      // Update leaderboard with new result
      const newEntry = {
        rank: leaderboard.length + 1, // Simple append for POC
        name: userName || data.channel_name || "Anonymous",
        car: carModel || data.car_model,
        time: data.estimated_lap_time,
        level: data.driver_level,
        url: url,
        mods: data.detected_mods ? data.detected_mods.join(', ') : (engineMod + ' ' + suspensionMod + ' ' + aeroMod)
      };
      // Sort by time (simplified string sort for now, ideally convert to ms)
      const newLeaderboard = [...leaderboard, newEntry].sort((a, b) => a.time.localeCompare(b.time));
      
      // Re-assign ranks
      newLeaderboard.forEach((entry, index) => entry.rank = index + 1);
      
      setLeaderboard(newLeaderboard);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          <form onSubmit={handleSubmit} className="input-group">
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
            placeholder="Engine Mods (e.g. Stock, Supercharged)"
            value={engineMod}
            onChange={(e) => setEngineMod(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Suspension Mods (e.g. Ohlins, JRZ)"
            value={suspensionMod}
            onChange={(e) => setSuspensionMod(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Aero Mods (e.g. Wing, Splitter)"
            value={aeroMod}
            onChange={(e) => setAeroMod(e.target.value)}
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
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Lap'}
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
                  <ul>
                    {result.detected_mods?.map((mod, i) => <li key={i}>{mod}</li>)}
                  </ul>
                </div>
              </div>

              <div className="section feedback">
                <h3>Driving Analysis (Level: {result.driver_level}/10)</h3>
                <p>{result.driving_feedback}</p>
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
        button { padding: 1rem 1.5rem; background: #000; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1.1rem; align-self: center; width: 50%; }
        button:disabled { opacity: 0.6; }
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
        }
      `}</style>
    </div>
  );
}
