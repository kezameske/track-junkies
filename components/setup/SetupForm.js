export default function SetupForm({ open, onToggle, carModel, tire, url, children }) {
  return (
    <details
      className="bg-racing-card border border-gray-800 rounded-2xl overflow-hidden"
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
    >
      <summary className="list-none cursor-pointer px-5 py-4 flex justify-between items-baseline gap-4 select-none border-b border-gray-800/60 hover:bg-racing-surface/30 transition-colors">
        <span className="font-heading font-bold text-gray-200 uppercase tracking-wider text-sm">
          Run Setup
        </span>
        <span className="text-gray-500 text-xs font-mono truncate">
          {carModel ? carModel : 'Car'}{tire ? ` · ${tire}` : ''}{url ? ' · Link set' : ''}
        </span>
      </summary>
      {children}
    </details>
  );
}
