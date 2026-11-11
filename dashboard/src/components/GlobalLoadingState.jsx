export default function GlobalLoadingState({ isLoadingData = false, children }) {
  if (!isLoadingData) return children;

  return (
    <div role="status" className="space-y-3">
      <p className="text-sm text-slate-600">Loading catalog…</p>
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map(card => (
          <div key={card} className="glass-card space-y-3 p-5">
            <div className="skeleton h-4 w-28 rounded-md" />
            <div className="skeleton h-8 w-full rounded-lg" />
            <div className="skeleton h-3 w-3/4 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
