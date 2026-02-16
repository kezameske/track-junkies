export default function LeaderboardTable({ entries, userName, onSelectEntry }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead>
          <tr className="bg-racing-surface/80 text-[0.7rem] uppercase tracking-wider text-gray-500">
            <th className="py-2.5 px-3 text-left w-10">#</th>
            <th className="py-2.5 px-3 text-left w-[90px]">Time</th>
            <th className="py-2.5 px-3 text-left w-1/4">Driver</th>
            <th className="py-2.5 px-3 text-left w-1/4">Car</th>
            <th className="py-2.5 px-3 text-left w-[60px]">Score</th>
            <th className="py-2.5 px-3 text-left w-[70px]">Video</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {entries.map((entry, i) => (
            <tr
              key={i}
              className={`transition-colors hover:bg-racing-surface/40 ${
                entry.name === userName ? 'bg-racing-cyan/5' : ''
              }`}
            >
              <td className="py-2.5 px-3 text-gray-500 font-mono text-xs">{entry.rank}</td>
              <td className="py-2.5 px-3">
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="font-mono font-bold text-racing-cyan hover:text-white border-b border-dashed border-racing-cyan/30 hover:border-racing-cyan transition-colors bg-transparent cursor-pointer p-0"
                >
                  {entry.time}
                </button>
              </td>
              <td className="py-2.5 px-3 truncate">
                <span className="font-semibold text-gray-300">{entry.name}</span>
              </td>
              <td className="py-2.5 px-3 truncate">
                <span className="text-gray-500 text-xs">{entry.car}</span>
              </td>
              <td className="py-2.5 px-3 font-bold text-gray-300">{entry.level}</td>
              <td className="py-2.5 px-3">
                {entry.url ? (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-racing-cyan/80 hover:text-racing-cyan text-xs transition-colors"
                  >
                    YouTube
                  </a>
                ) : (
                  <span className="text-gray-700">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
