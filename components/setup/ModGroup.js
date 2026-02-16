export default function ModGroup({ legend, options, loading, onToggle }) {
  return (
    <fieldset
      className="border border-gray-800 rounded-xl px-4 py-3 bg-racing-surface/30 disabled:opacity-50"
      disabled={loading}
    >
      <legend className="px-2 font-heading font-bold text-[0.7rem] uppercase tracking-[0.15em] text-gray-500">
        {legend}
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(options).map(([label, checked]) => (
          <label
            key={label}
            className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer truncate hover:text-gray-200 transition-colors"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(label)}
              disabled={loading}
              className="w-3.5 h-3.5 rounded border-gray-600 bg-racing-bg text-racing-cyan focus:ring-racing-cyan/30 focus:ring-offset-0 accent-[#00F5FF]"
            />
            <span className="truncate">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
