import { BookOpen, CheckCircle2, Focus, MonitorPlay } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { demoLesson, lessonSteps, studentProgress } from '@/lib/demo-data'

export function PlayerSurface() {
  const currentStep = lessonSteps.find((step) => step.status === 'current') ?? lessonSteps[0]

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="accent" className="mb-4 bg-surface-container-lowest">
              学生学习页面
            </Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
              {demoLesson.title}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-on-surface-variant">
              {demoLesson.objective} 今日路径包含导入、讲授、练习、总结四个课堂步骤。
            </p>
          </div>
          <div className="rounded-full bg-surface-container-lowest px-5 py-3 text-sm text-primary shadow-ambient">
            {studentProgress.completedSteps}/{studentProgress.totalSteps} 已完成
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {lessonSteps.map((step, index) => (
              <div key={step.id} className={`rounded-3xl p-4 ${step.status === 'current' ? 'bg-surface-container-lowest shadow-ambient' : 'bg-surface-container-lowest/70'}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-full text-sm font-semibold ${step.status === 'done' ? 'bg-tertiary-container text-tertiary' : 'bg-primary-container/25 text-primary'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold">{step.title}</h2>
                    <p className="text-sm text-on-surface-variant">{step.duration}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <Card className="min-h-[360px] bg-surface-container-lowest p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm text-on-surface-variant">当前步骤 · {currentStep.focus}</p>
                <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">{currentStep.title}</h2>
              </div>
              <Badge variant="accent">{studentProgress.currentStep}</Badge>
            </div>
            <div className="mt-6 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
              <div className="flex items-center gap-3">
                <MonitorPlay className="size-6 text-primary" aria-hidden />
                <h3 className="text-2xl font-semibold">观察角色坐标变化</h3>
              </div>
              <p className="mt-5 leading-8 text-on-surface-variant">
                先观察角色从舞台中心移动到目标点的过程，再说出 x 坐标和 y 坐标分别发生了什么变化。
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-surface-container-lowest p-5">
                  <BookOpen className="mb-3 size-6 text-primary" aria-hidden />
                  <p className="font-semibold">学习提示</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">顺序执行表示脚本会按照从上到下的顺序运行。</p>
                </div>
                <div className="rounded-3xl bg-surface-container-lowest p-5">
                  <CheckCircle2 className="mb-3 size-6 text-tertiary" aria-hidden />
                  <p className="font-semibold">完成状态</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">导入已完成，讲授正在进行。</p>
                </div>
              </div>
            </div>
          </Card>

          <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
            <div className="flex items-center gap-3">
              <Focus className="size-6 text-primary" aria-hidden />
              <h2 className="text-2xl font-semibold">沉浸学习</h2>
            </div>
            <p className="mt-4 leading-8 text-on-surface-variant">
              减少侧边干扰后，学生可以专注阅读当前讲授内容；完整沉浸交互会在后续课堂播放器阶段接入。
            </p>
          </section>
        </main>
      </section>
    </div>
  )
}
