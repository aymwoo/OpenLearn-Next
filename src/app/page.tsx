export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface text-foreground p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">OpenLearn Next</h1>
          <p className="text-lg text-muted-foreground">面向未来教育的 AI 原生开源操作系统</p>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-surface-elevated tonal-shadow space-y-4">
            <h2 className="text-2xl font-semibold">教师工作台</h2>
            <p className="text-muted-foreground">可编排的课堂流程，AI 协同产出教学包。</p>
          </div>
          <div className="p-6 rounded-2xl bg-surface-elevated tonal-shadow space-y-4">
            <h2 className="text-2xl font-semibold">学生学习端</h2>
            <p className="text-muted-foreground">按进度可追踪的课堂流程与交互式学习。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
