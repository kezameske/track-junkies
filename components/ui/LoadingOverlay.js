export default function LoadingOverlay({ progress }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/80 animate-fade-in"
      role="status"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Dual counter-rotating spinners */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-racing-cyan animate-spin-slow" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-racing-blue animate-spin-reverse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-racing-cyan">{progress}%</span>
          </div>
        </div>

        <p className="font-heading text-lg font-bold uppercase tracking-widest text-gray-400">
          Analyzing lap telemetry...
        </p>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-racing-cyan to-racing-blue rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
