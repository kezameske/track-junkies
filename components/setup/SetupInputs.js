export default function SetupInputs({ userName, carModel, url, tire, loading, onChange }) {
  const inputClass =
    'w-full px-4 py-3.5 rounded-xl bg-racing-surface border border-gray-700 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-racing-cyan focus:ring-1 focus:ring-racing-cyan/30 transition-colors disabled:opacity-50';

  return (
    <>
      <input
        type="text"
        placeholder="Driver Name (e.g. The Stig)"
        value={userName}
        onChange={(e) => onChange('userName', e.target.value)}
        className={inputClass}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Car Model (e.g. S2000, M3)"
        value={carModel}
        onChange={(e) => onChange('carModel', e.target.value)}
        required
        className={inputClass}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Paste YouTube Link (e.g., https://youtu.be/...)"
        value={url}
        onChange={(e) => onChange('url', e.target.value)}
        required
        className={`${inputClass} border-racing-cyan/30`}
        disabled={loading}
      />
      <input
        type="text"
        placeholder="Tire (e.g. RE-71RS, A052)"
        value={tire}
        onChange={(e) => onChange('tire', e.target.value)}
        className={inputClass}
        disabled={loading}
      />
    </>
  );
}
