export default function AnalysisActions({ loading, setupOpen, onAnalyze, onToggleSetup }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
      {/* Analyze button */}
      <button
        type="button"
        onClick={onAnalyze}
        disabled={loading}
        className="group relative w-full py-4 px-6 rounded-xl font-heading text-lg font-bold uppercase tracking-widest text-white
                   bg-gradient-to-r from-racing-cyan to-racing-blue
                   shadow-cyan-glow-sm hover:shadow-cyan-glow
                   transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                   overflow-hidden"
      >
        {/* Shimmer overlay on hover */}
        <span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                     opacity-0 group-hover:opacity-100 group-hover:animate-shimmer
                     bg-[length:200%_100%] pointer-events-none"
          aria-hidden="true"
        />
        <span className="relative">{loading ? 'Analyzing...' : 'Analyze Lap'}</span>
      </button>

      {/* Toggle setup button */}
      <button
        type="button"
        onClick={onToggleSetup}
        disabled={loading}
        className="py-4 px-5 rounded-xl font-heading font-bold text-sm uppercase tracking-wider
                   border border-gray-700 text-gray-300 bg-racing-surface
                   hover:border-racing-cyan/40 hover:text-racing-cyan
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {setupOpen ? 'Hide Setup' : 'Edit Run Setup'}
      </button>
    </div>
  );
}
