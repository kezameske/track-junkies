import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';
import ResultCard from '../components/results/ResultCard';
import AnalysisActions from '../components/results/AnalysisActions';
import SetupForm from '../components/setup/SetupForm';
import SetupInputs from '../components/setup/SetupInputs';
import ModGroup from '../components/setup/ModGroup';
import Leaderboard from '../components/leaderboard/Leaderboard';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import LatestAnalysis from '../components/leaderboard/LatestAnalysis';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import Modal from '../components/ui/Modal';
import ErrorMessage from '../components/ui/ErrorMessage';

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
  const [selectedEntry, setSelectedEntry] = useState(null);
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

  const handleInputChange = (field, value) => {
    const setters = { userName: setUserName, carModel: setCarModel, url: setUrl, tire: setTire };
    setters[field]?.(value);
  };

  return (
    <>
      <Head>
        <title>Track Junkies — AI Lap Time Estimator</title>
        <meta name="description" content="AI-powered lap time estimator for Buttonwillow Raceway 13CW" />
      </Head>

      <div className={`max-w-[1200px] mx-auto px-4 py-8 font-body ${loading ? 'select-none' : ''}`}>
        {loading && <LoadingOverlay progress={progress} />}
        <Modal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

        <Header />

        <main
          className="grid grid-cols-1 lg:grid-cols-[minmax(440px,1fr)_minmax(560px,1.35fr)] gap-8 items-start"
          aria-busy={loading}
          aria-disabled={loading}
        >
          {/* Left panel */}
          <section className="flex flex-col gap-4 min-w-0">
            <ErrorMessage message={error} />
            <ResultCard result={result} loading={loading} progress={progress} />
            <AnalysisActions
              loading={loading}
              setupOpen={setupOpen}
              onAnalyze={handleSubmit}
              onToggleSetup={() => setSetupOpen((v) => !v)}
            />

            <SetupForm open={setupOpen} onToggle={setSetupOpen} carModel={carModel} tire={tire} url={url}>
              <form
                onSubmit={(e) => e.preventDefault()}
                onKeyDown={handleKeyDown}
                className="flex flex-col gap-4 p-5"
              >
                <SetupInputs
                  userName={userName}
                  carModel={carModel}
                  url={url}
                  tire={tire}
                  loading={loading}
                  onChange={handleInputChange}
                />

                <ModGroup legend="Engine" options={mods.engine} loading={loading} onToggle={toggleEngine} />
                <ModGroup legend="ECU" options={mods.ecu} loading={loading} onToggle={(l) => setSingleChoice('ecu', l)} />
                <ModGroup legend="Drivetrain" options={mods.drivetrain} loading={loading} onToggle={(l) => setSingleChoice('drivetrain', l)} />
                <ModGroup legend="Suspension" options={mods.suspension} loading={loading} onToggle={(l) => setSingleChoice('suspension', l)} />
                <ModGroup legend="Aero" options={mods.aero} loading={loading} onToggle={(l) => setSingleChoice('aero', l)} />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-widest text-white
                             bg-gradient-to-r from-racing-cyan to-racing-blue
                             hover:shadow-cyan-glow-sm transition-all duration-300
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Analyze Lap'}
                </button>
              </form>
            </SetupForm>
          </section>

          {/* Right panel */}
          <aside className="sticky top-6 self-start">
            <Leaderboard>
              <LeaderboardTable
                entries={leaderboard}
                userName={userName}
                onSelectEntry={setSelectedEntry}
              />
              <LatestAnalysis result={result} />
            </Leaderboard>
          </aside>
        </main>
      </div>
    </>
  );
}
