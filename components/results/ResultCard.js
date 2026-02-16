export default function ResultCard({ result, loading, progress }) {
  if (loading) {
    return (
      <div className="relative bg-racing-card border border-racing-cyan/20 rounded-2xl p-8 overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-racing-cyan via-racing-blue to-purple-500" />

        <h2 className="font-heading text-2xl font-bold text-gray-300 uppercase tracking-wide">
          Analyzing Lap...
        </h2>
        <p className="mt-2 text-gray-500 text-sm">
          Estimating lap time and driver score. This may take a moment.
        </p>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-racing-cyan to-racing-blue rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="relative bg-racing-card rounded-2xl p-8 overflow-hidden animate-fade-in">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-racing-cyan via-racing-blue to-purple-500" />

        {/* Score header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex flex-col items-start">
            <h2 className="font-heading text-xl font-bold text-gray-400 uppercase tracking-wider">
              Driver Score
            </h2>
          </div>

          {/* Score circle */}
          <div className="relative ml-auto animate-pop-in">
            <div className="w-32 h-32 rounded-full border-4 border-racing-cyan shadow-cyan-glow flex flex-col items-center justify-center bg-racing-bg">
              <span className="font-heading text-5xl font-black text-white leading-none">
                {result.driver_level}
              </span>
              <span className="text-xs font-mono text-gray-500 mt-0.5">/100</span>
            </div>
          </div>
        </div>

        {/* Feedback section */}
        <div>
          <h3 className="font-heading text-lg font-bold text-gray-300 uppercase tracking-wide mb-4 pb-2 border-b border-racing-cyan/20">
            AI Coach Feedback
          </h3>
          {Array.isArray(result.driving_feedback) ? (
            <ul className="space-y-3">
              {result.driving_feedback.map((item, i) => (
                <li
                  key={i}
                  className="bg-racing-surface/50 border-l-2 border-racing-cyan/30 rounded-r-lg px-4 py-3 text-sm text-gray-300 leading-relaxed"
                >
                  <span className="text-racing-cyan mr-2">&#9654;</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm leading-relaxed">{result.driving_feedback}</p>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="relative bg-racing-card/60 border border-gray-800 rounded-2xl p-8 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
      <h2 className="font-heading text-2xl font-bold text-gray-500 uppercase tracking-wide">
        Driver Score
      </h2>
      <p className="mt-3 text-gray-600 text-sm">
        Run an analysis to see your driver score and coaching feedback.
      </p>
    </div>
  );
}
