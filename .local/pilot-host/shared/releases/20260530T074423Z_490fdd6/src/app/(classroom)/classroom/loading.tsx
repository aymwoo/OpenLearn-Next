export default function Loading() {
  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface">
      <section className="mx-auto grid max-w-7xl gap-6 rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-on-surface-variant">页面外壳正在加载</p>
          <div className="h-80 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
        </div>
        <aside className="h-80 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
      </section>
    </main>
  )
}
