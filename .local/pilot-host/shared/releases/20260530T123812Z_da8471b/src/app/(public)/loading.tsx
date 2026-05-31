export default function Loading() {
  return (
    <main className="min-h-screen bg-surface p-6 text-on-surface">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient">
        <p className="text-sm font-semibold text-on-surface-variant">页面外壳正在加载</p>
        <div className="h-16 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-72 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
          <div className="h-72 rounded-[var(--radius-shell)] bg-surface-container-lowest" />
        </div>
      </section>
    </main>
  )
}
