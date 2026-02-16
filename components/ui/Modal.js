export default function Modal({ entry, onClose }) {
  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center backdrop-blur-2xl bg-black/90 p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-racing-card border border-racing-cyan/20 rounded-2xl p-6 max-w-lg w-full shadow-cyan-glow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-racing-cyan/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-xl font-bold uppercase tracking-wider text-white">
            Run Details
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-racing-surface text-gray-400 text-xs font-bold uppercase tracking-wider hover:text-white hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Mods section */}
        <div className="mb-5">
          <div className="font-heading text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Mods
          </div>
          <div className="text-sm text-gray-300 bg-racing-surface/50 rounded-lg px-4 py-3 border-l-2 border-racing-cyan/20">
            {entry.mods || 'None listed'}
          </div>
        </div>

        {/* AI Feedback section */}
        <div>
          <div className="font-heading text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            AI Feedback
          </div>
          {entry.summary ? (
            <ul className="space-y-2">
              {entry.summary.split('\n').filter(Boolean).map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-300 bg-racing-surface/50 rounded-lg px-4 py-3 border-l-2 border-racing-cyan/20"
                >
                  <span className="text-racing-cyan mr-2">&#9654;</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 bg-racing-surface/50 rounded-lg px-4 py-3">
              No feedback available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
