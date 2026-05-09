import Link from 'next/link'
import { BookOpenCheck, Focus, Layers3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { StudentPlayerDTO, StudentPlayerShellDTO } from '@/lib/dto/learning'

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
    <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        <div className="grid gap-3">
          {shell.steps.map((step, index) => (
            <div key={step.id} className="rounded-[1.4rem] bg-surface-container-lowest p-4 shadow-ambient">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-sm font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span>
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

type PlayerPersonalRegionProps = {
  player?: Pick<StudentPlayerDTO, 'runtime'> | null
  personalSlot: React.ReactNode
}

export function PlayerPersonalRegion({ player, personalSlot }: PlayerPersonalRegionProps) {
  const forcedLabel = player?.runtime.forcedLabel ?? '老师指定'

  return (
    <div className="min-w-0">
      <span className="sr-only">{forcedLabel}，内容步骤支持已完成阅读状态。</span>
      {personalSlot}
    </div>
  )
}

export function PlayerSurface({ shell, personalSlot }: PlayerSurfaceProps) {
  if (!shell) {
    return <InaccessibleState />
  }

  return (
    <div className="space-y-5 p-4 sm:p-5 lg:p-6">
      <section className="overflow-hidden rounded-[var(--radius-shell)] bg-[#0f1722] text-white shadow-ambient">
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="accent" className="bg-white/10 text-white">全屏沉浸学习模式</Badge>
                <Badge className="bg-white/8 text-white/80">学生学习页面</Badge>
              </div>
              <h1 className="mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">{shell.title}</h1>
              <p className="mt-3 text-sm leading-7 text-white/72 sm:text-base sm:leading-8">{shell.objective}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[26rem]">
              <ImmersiveMetric icon={<Layers3 className="size-4" aria-hidden />} label="环节数量" value={`${shell.steps.length}`} detail="跟随课堂流程" />
              <ImmersiveMetric icon={<BookOpenCheck className="size-4" aria-hidden />} label="学习方式" value="沉浸" detail="保留现有数据交互" />
              <ImmersiveMetric icon={<Focus className="size-4" aria-hidden />} label="当前体验" value="低干扰" detail="聚焦当前步骤" />
            </div>
          </div>
        </div>
      </section>

      {personalSlot}
    </div>
  )
}

function ImmersiveMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white/6 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-white/65">
        <span className="rounded-full bg-white/8 p-2 text-white">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.7rem] font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/60">{detail}</p>
    </div>
  )
}
