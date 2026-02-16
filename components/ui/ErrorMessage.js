export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-racing-red/10 border border-racing-red/30 text-sm text-red-300">
      <span className="text-racing-red mt-0.5 flex-shrink-0">&#9888;</span>
      <span>{message}</span>
    </div>
  );
}
