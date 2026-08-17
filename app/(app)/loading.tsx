export default function AppLoading() {
  return (
    <div className="px-4 md:px-6 py-6 space-y-4" aria-label="Loading page">
      <div className="h-6 w-28 rounded-lg bg-stone-200 animate-pulse" />
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-stone-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-28 rounded bg-stone-100 animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-stone-100 animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-3/4 rounded bg-stone-100 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-xl bg-stone-100 animate-pulse" />
              <div className="h-8 w-24 rounded-xl bg-stone-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
