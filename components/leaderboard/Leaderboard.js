export default function Leaderboard({ children }) {
  return (
    <div className="bg-racing-card rounded-2xl overflow-hidden border border-gray-800/60">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-700 to-blue-700 px-5 py-4">
        <h2 className="font-heading text-lg font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <span className="text-xl">&#127942;</span>
          Leaderboard
        </h2>
      </div>
      {children}
    </div>
  );
}
