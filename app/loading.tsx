/**
 * グローバル loading UI。
 * RSC streaming / page transition 中に表示される。
 *
 * 「真っ白い画面」を防ぐためのスケルトン表示。
 * 体感速度（perceived performance）を改善する。
 */
export default function Loading() {
  return (
    <main className="min-h-[60vh] bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* ヘッダースケルトン */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-slate-200" />
          </div>
        </div>

        {/* カードスケルトン */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
          <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
          <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-blue-400" />
          <span className="ml-1">読み込み中…</span>
        </div>
      </div>
    </main>
  );
}
