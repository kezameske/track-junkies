export default function Header() {
  return (
    <header className="relative text-center pt-12 pb-10 mb-8">
      {/* Ambient glow behind title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-96 h-32 bg-racing-cyan/10 rounded-full blur-3xl" />
      </div>

      <h1 className="relative font-heading text-6xl md:text-7xl font-black uppercase tracking-widest text-gradient-cyan leading-none">
        Track Junkies
      </h1>

      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-racing-cyan/60" />
        <span className="font-mono text-xs tracking-[0.3em] uppercase text-gray-500">
          AI-Powered Lap Time Estimator
        </span>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-racing-cyan/60" />
      </div>

      <p className="mt-2 text-sm text-gray-600 font-mono tracking-wider">
        Buttonwillow 13CW
      </p>

      {/* Bottom divider with glow dot */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-0">
        <span className="h-px w-24 bg-gradient-to-r from-transparent to-racing-cyan/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-racing-cyan shadow-cyan-glow-sm" />
        <span className="h-px w-24 bg-gradient-to-l from-transparent to-racing-cyan/40" />
      </div>
    </header>
  );
}
