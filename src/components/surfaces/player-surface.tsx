import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { StudentPlayerShellDTO } from '@/lib/dto/learning'

type PlayerSurfaceProps = {
  shell: StudentPlayerShellDTO | null
  personalSlot: React.ReactNode
}

function InaccessibleState() {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
      <Badge variant="accent" className="mb-4 bg-surface-container-lowest">学生学习页面</Badge>
      <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">课时暂不可学习</h1>
      <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">请回到学生空间选择老师已经发布的课时，或稍后刷新状态。</p>
      <Button asChild className="mt-7">
        <Link href="/student">回到学生空间</Link>
      </Button>
    </section>
  )
}

export function PlayerPersonalFallback({ shell }: { shell: StudentPlayerShellDTO }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="flex gap-3 overflow-x-auto pb-2 xl:grid xl:grid-cols-1 xl:overflow-visible xl:pb-0">
          {shell.steps.map((step, index) => (
            <div key={step.id} className="min-w-56 rounded-full bg-surface-container-lowest/70 p-4 xl:min-w-0 xl:rounded-3xl">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-sm font-semibold text-primary">{index + 1}</span>
                <div>
                  <h2 className="font-semibold">{step.title}</h2>
                  <p className="text-sm text-on-surface-variant">正在加载你的学习进度</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 space-y-5">
        <Card className="min-h-[360px] bg-surface-container-lowest p-5 sm:p-8">
          <p className="text-sm text-on-surface-variant">正在加载你的学习进度</p>
          <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">正在准备学习状态</h2>
          <div className="mt-6 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-5 sm:p-8">
            <p className="leading-8 text-on-surface-variant">正在读取最近一次提交</p>
          </div>
        </Card>
      </main>
    </section>
  )
}

export function PlayerSurface({ shell, personalSlot }: PlayerSurfaceProps) {
  if (!shell) {
    return <InaccessibleState />
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="accent" className="mb-4 bg-surface-container-lowest">学生学习页面</Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">{shell.title}</h1>
            <p className="mt-4 max-w-3xl leading-8 text-on-surface-variant">{shell.objective}</p>
          </div>
          <div className="rounded-full bg-surface-container-lowest px-5 py-3 text-sm text-primary shadow-ambient">{shell.steps.length} 个步骤</div>
        </div>
      </section>
      {personalSlot}
    </div>
  )
}
