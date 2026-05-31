export default function Loading() {
  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface">
      <section className="mx-auto flex max-w-6xl flex-col gap-5 rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-sm font-semibold text-on-surface-variant">页面外壳正在加载</p>
        <div className="h-44 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-36 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
          <div className="h-36 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
          <div className="h-36 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
        </div>
      </section>
    </main>
  )
}
