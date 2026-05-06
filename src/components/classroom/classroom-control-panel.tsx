'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Clock3, Radio, Sparkles, TimerReset, Users } from 'lucide-react'
import { ClassroomRosterPanel } from './classroom-roster-panel'
import { ClassroomConflictPanel } from './classroom-conflict-panel'
import { changeClassroomStepAction, changeClassroomModeAction, endClassroomSessionAction } from '@/actions/classroom-actions'
import { Button } from '@/components/ui/button'

export function ClassroomControlPanel({ initialSnapshot }: { initialSnapshot: any }) {
  const [conflict, setConflict] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const currentSnapshot = conflict?.latest || initialSnapshot
  const currentStep = currentSnapshot.steps.find((s: any) => s.id === currentSnapshot.activeStepId)
  const connectedCount = currentSnapshot.participants.filter((participant: any) => participant.connectionState === 'connected').length
  const completionRate = currentSnapshot.participants.length > 0
    ? Math.round((connectedCount / currentSnapshot.participants.length) * 100)
    : 0

  const handleChangeStep = (stepId: string, title: string) => {
    if (conflict || isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('targetStepId', stepId)
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomStepAction(formData)
      if (!result.ok && result.error === "VERSION_CONFLICT") {
        setConflict(result)
      } else if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleChangeMode = (locked: boolean) => {
    if (conflict || isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('locked', String(locked))
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomModeAction(formData)
      if (!result.ok && result.error === "VERSION_CONFLICT") {
        setConflict(result)
      } else if (result.ok) {
        router.refresh()
      }
    })
  }

  const handleEndClassroom = () => {
    if (conflict || isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      const result = await endClassroomSessionAction(formData)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-[0_16px_40px_rgba(44,47,49,0.05)] sm:p-6">
        {conflict && (
          <ClassroomConflictPanel 
            sessionId={currentSnapshot.sessionId} 
            onRefresh={() => setConflict(null)} 
          />
        )}

          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-[1.75rem] bg-linear-135 from-primary to-primary-container p-6 text-on-primary shadow-ambient">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="accent" className="bg-white/15 text-white">
                      {currentSnapshot.className} · 课堂运行
                    </Badge>
                    <Badge variant="default" className="bg-white/15 text-white">
                      第 {currentSnapshot.version} 次同步
                    </Badge>
                  </div>
                  <h1 className="mt-4 max-w-3xl text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[3rem]">
                    {currentSnapshot.lessonTitle}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-on-primary/85">
                    保持教师端对讲授、提问和练习环节的统一调度。当前正在执行“{currentStep?.title ?? '未开始步骤'}”。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:w-[23rem] xl:grid-cols-1">
                  <MetricOrb icon={<Users className="size-4" />} label="出勤率" value={`${completionRate}%`} detail={`${connectedCount}/${currentSnapshot.participants.length} 在线`} inverted />
                  <MetricOrb icon={<Sparkles className="size-4" />} label="模式" value={currentSnapshot.locked ? '锁定跟随' : '自由浏览'} detail={currentSnapshot.locked ? '全员同步同一步骤' : '学生可自主浏览'} inverted />
                  <MetricOrb icon={<Clock3 className="size-4" />} label="课堂状态" value="进行中" detail={`更新于 ${new Date(currentSnapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} inverted />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Card className="bg-surface-container-lowest p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-on-surface-variant">当前步骤</p>
                    <h2 className="mt-2 text-2xl font-semibold">{currentStep?.title}</h2>
                  </div>
                  <Radio className="size-6 text-primary" aria-hidden />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StageMeta label="课堂模式" value={currentSnapshot.locked ? '锁定跟随' : '自由浏览'} />
                  <StageMeta label="在线人数" value={`${connectedCount}/${currentSnapshot.participants.length}`} />
                  <StageMeta label="课堂节奏" value={currentStep?.title ?? '待开始'} />
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-sm text-on-surface-variant">步骤流转</p>
                  {currentSnapshot.steps.map((step: any) => (
                    <div key={step.id} className={`flex flex-col gap-3 rounded-[1.25rem] p-4 sm:flex-row sm:items-center sm:justify-between ${currentSnapshot.activeStepId === step.id ? 'bg-primary/8' : 'bg-surface-container-low'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${currentSnapshot.activeStepId === step.id ? 'bg-primary text-white' : 'bg-surface-container-lowest text-primary'}`}>
                          {currentSnapshot.steps.findIndex((item: any) => item.id === step.id) + 1}
                        </span>
                        <span className="font-medium text-on-surface">{step.title}</span>
                      </div>
                      <Button
                        variant={currentSnapshot.activeStepId === step.id ? 'primary' : 'secondary'}
                        disabled={currentSnapshot.activeStepId === step.id || isPending || !!conflict}
                        className="min-h-[44px] px-5"
                        onClick={() => handleChangeStep(step.id, step.title)}
                      >
                        {currentSnapshot.activeStepId === step.id ? '当前步骤' : '进入下一环节'}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="bg-surface-container-lowest p-5 sm:p-6">
                <p className="text-sm text-on-surface-variant">实时互动工具</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <UtilityOrb icon={<TimerReset className="size-5" />} label="随机点名" />
                  <UtilityOrb icon={<Clock3 className="size-5" />} label="快速测速" />
                  <UtilityOrb icon={<Users className="size-5" />} label="随堂小测" />
                  <UtilityOrb icon={<Sparkles className="size-5" />} label="目标共享" />
                </div>

                <p className="mt-6 text-sm text-on-surface-variant">课堂模式</p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={() => handleChangeMode(true)}
                    disabled={isPending || !!conflict}
                    className={`min-h-[44px] rounded-3xl p-5 text-left transition-colors duration-150 ${currentSnapshot.locked ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-low hover:bg-surface-container-low/80'}`}
                  >
                    <p className="text-2xl font-semibold">锁定跟随</p>
                    <p className="mt-2 text-sm">学生端跟随教师当前步骤。</p>
                  </button>
                  <button
                    onClick={() => handleChangeMode(false)}
                    disabled={isPending || !!conflict}
                    className={`min-h-[44px] rounded-3xl p-5 text-left transition-colors duration-150 ${!currentSnapshot.locked ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-low hover:bg-surface-container-low/80'}`}
                  >
                    <p className="text-2xl font-semibold">自由浏览</p>
                    <p className="mt-2 text-sm text-on-surface-variant">学生可回看已开放的步骤内容。</p>
                  </button>
                </div>

                <div className="mt-8">
                  <Button variant="secondary" className="min-h-[48px] w-full bg-[#fef2f2] text-red-600 shadow-none hover:bg-[#fee2e2]" disabled={isPending || !!conflict} onClick={handleEndClassroom}>结束课堂</Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

      <ClassroomRosterPanel participants={currentSnapshot.participants} />
    </section>
  )
}

function MetricOrb({ icon, label, value, detail, inverted = false }: { icon: React.ReactNode; label: string; value: string; detail: string; inverted?: boolean }) {
  return (
    <div className={inverted ? 'rounded-[1.5rem] bg-white/12 px-4 py-4 backdrop-blur-sm' : 'rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 shadow-[0_12px_30px_rgba(44,47,49,0.04)]'}>
      <div className={inverted ? 'flex items-center gap-2 text-xs font-medium text-on-primary/75' : 'flex items-center gap-2 text-xs font-medium text-on-surface-variant'}>
        <span className={inverted ? 'rounded-full bg-white/15 p-2 text-white' : 'rounded-full bg-surface-container-low p-2 text-primary'}>{icon}</span>
        {label}
      </div>
      <p className={inverted ? 'mt-3 text-[1.6rem] font-semibold tracking-tight text-white' : 'mt-3 text-[1.6rem] font-semibold tracking-tight text-on-surface'}>{value}</p>
      <p className={inverted ? 'mt-1 text-xs text-on-primary/75' : 'mt-1 text-xs text-on-surface-variant'}>{detail}</p>
    </div>
  )
}

function StageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-low p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function UtilityOrb({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex min-h-[96px] flex-col items-center justify-center gap-3 rounded-[1.4rem] bg-surface-container-low text-center text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high">
      <span className="rounded-full bg-surface-container-lowest p-3 text-primary shadow-[0_10px_26px_rgba(44,47,49,0.04)]">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
