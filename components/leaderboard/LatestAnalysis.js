export default function LatestAnalysis({ result }) {
  if (!result) return null;

  return (
    <div className="px-5 py-4 border-t border-gray-800/60">
      <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
        Latest Analysis
      </h3>
      <div className="font-mono font-bold text-racing-cyan text-sm mb-3">
        Driver Score: {result.driver_level}/100
      </div>
      {Array.isArray(result.driving_feedback) ? (
        <ul className="space-y-1.5 text-xs text-gray-400">
          {result.driving_feedback.slice(0, 3).map((item, i) => (
            <li key={i} className="pl-3 border-l border-racing-cyan/20">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">{result.driving_feedback}</p>
      )}
    </div>
  );
}
