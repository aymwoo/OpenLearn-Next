'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Radio, Sparkles, TimerReset, Users } from 'lucide-react'

import { changeClassroomModeAction, changeClassroomStepAction, endClassroomSessionAction } from '@/actions/classroom-actions'
import { ClassroomConflictPanel } from './classroom-conflict-panel'
import { ClassroomRosterPanel } from './classroom-roster-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClassroomSnapshotDTO, ClassroomStepDTO } from '@/lib/dto/classroom'

type ConflictState = { latest?: ClassroomSnapshotDTO } | null

function hasLatestSnapshot(value: unknown): value is { latest: ClassroomSnapshotDTO } {
  return typeof value === 'object' && value !== null && 'latest' in value
}

export function ClassroomControlPanel({ initialSnapshot }: { initialSnapshot: ClassroomSnapshotDTO }) {
  const [conflict, setConflict] = useState<ConflictState>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const currentSnapshot = conflict?.latest || initialSnapshot
  const currentStep = currentSnapshot.steps.find((step: ClassroomStepDTO) => step.id === currentSnapshot.activeStepId)
  const connectedCount = currentSnapshot.participants.filter((participant) => participant.connectionState === 'connected').length
  const totalParticipants = currentSnapshot.participants.length
  const completionRate = totalParticipants > 0 ? Math.round((connectedCount / totalParticipants) * 100) : 0

  const handleChangeStep = (stepId: string) => {
    if (conflict || isPending) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', currentSnapshot.sessionId)
      formData.append('targetStepId', stepId)
      formData.append('expectedVersion', String(currentSnapshot.version))
      const result = await changeClassroomStepAction(formData)
      if (!result.ok && result.error === 'VERSION_CONFLICT') {
        setConflict(hasLatestSnapshot(result) ? result : null)
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
      if (!result.ok && result.error === 'VERSION_CONFLICT') {
        setConflict(hasLatestSnapshot(result) ? result : null)
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
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {conflict ? <ClassroomConflictPanel sessionId={currentSnapshot.sessionId} onRefresh={() => setConflict(null)} /> : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_320px]">
          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="accent">{currentSnapshot.className}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">第 {currentSnapshot.version} 次同步</Badge>
                  </div>
                  <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] tracking-[-0.02em] text-on-surface sm:text-[2.5rem]">
                    {currentStep?.title ?? '未开始环节'}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base sm:leading-8">
                    课堂正在运行《{currentSnapshot.lessonTitle}》。当前以更紧凑的运行面板承接环节切换、模式控制和学生在线状态。
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:w-[22rem] lg:grid-cols-1">
                  <MetricOrb icon={<Users className="size-4" aria-hidden />} label="在线学生" value={`${connectedCount}/${totalParticipants}`} detail="课堂名册实时同步" />
                  <MetricOrb icon={<Radio className="size-4" aria-hidden />} label="当前模式" value={currentSnapshot.locked ? '锁定跟随' : '自由浏览'} detail={currentSnapshot.locked ? '学生锁定在当前步骤' : '学生可回看已开放步骤'} />
                  <MetricOrb icon={<Clock3 className="size-4" aria-hidden />} label="课堂活跃度" value={`${completionRate}%`} detail={`更新于 ${new Date(currentSnapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <StageMeta label="课程名称" value={currentSnapshot.lessonTitle} />
                <StageMeta label="当前步骤" value={currentStep?.title ?? '待开始'} />
                <StageMeta label="课堂状态" value={currentSnapshot.status === 'live' ? '进行中' : '已结束'} />
              </div>
            </div>
          </Card>

          <Card className="bg-surface-container-low p-5 sm:p-6">
            <p className="text-sm text-on-surface-variant">实时课堂控制</p>
            <div className="mt-4 grid gap-3">
              <Button
                variant={currentSnapshot.locked ? 'primary' : 'secondary'}
                disabled={isPending || !!conflict}
                className="min-h-[56px] justify-between rounded-[1.35rem] px-5"
                onClick={() => handleChangeMode(true)}
              >
                <span className="text-base font-semibold">锁定跟随</span>
                <span className="text-xs opacity-80">同步当前步骤</span>
              </Button>
              <Button
                variant={!currentSnapshot.locked ? 'primary' : 'secondary'}
                disabled={isPending || !!conflict}
                className="min-h-[56px] justify-between rounded-[1.35rem] px-5"
                onClick={() => handleChangeMode(false)}
              >
                <span className="text-base font-semibold">自由浏览</span>
                <span className="text-xs opacity-80">保留课堂上下文</span>
              </Button>
              <Button
                variant="secondary"
                className="min-h-[52px] rounded-[1.35rem] bg-[#fef2f2] text-red-600 shadow-none hover:bg-[#fee2e2]"
                disabled={isPending || !!conflict}
                onClick={handleEndClassroom}
              >
                结束课堂
              </Button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
              <p className="text-sm text-on-surface-variant">互动工具</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <UtilityOrb icon={<TimerReset className="size-5" aria-hidden />} label="随机点名" />
                <UtilityOrb icon={<Clock3 className="size-5" aria-hidden />} label="快速提问" />
                <UtilityOrb icon={<Users className="size-5" aria-hidden />} label="随堂小测" />
                <UtilityOrb icon={<Sparkles className="size-5" aria-hidden />} label="白板共享" />
              </div>
            </div>
          </Card>
        </section>

        <Card className="bg-surface-container-low p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">教学环节流程</p>
              <h3 className="mt-2 text-2xl font-semibold text-on-surface">课堂教学流程运行管理</h3>
            </div>
            <Badge className="bg-surface-container-lowest text-on-surface-variant">保持现有 step 切换动作</Badge>
          </div>

          <div className="mt-5 grid gap-3">
            {currentSnapshot.steps.map((step, index) => {
              const isActive = currentSnapshot.activeStepId === step.id
              return (
                <article
                  key={step.id}
                  className={isActive ? 'rounded-[1.6rem] bg-primary/8 p-4 sm:p-5' : 'rounded-[1.6rem] bg-surface-container-lowest p-4 shadow-ambient sm:p-5'}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={isActive ? 'grid size-11 place-items-center rounded-full bg-primary text-sm font-semibold text-white' : 'grid size-11 place-items-center rounded-full bg-surface-container-low text-sm font-semibold text-primary'}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-semibold text-on-surface">{step.title}</h4>
                          {isActive ? <Badge variant="accent">进行中</Badge> : null}
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {isActive ? '当前教学流程已同步到学生端。' : '保留现有 action，点击后切换到该环节。'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isActive ? 'primary' : 'secondary'}
                      disabled={isActive || isPending || !!conflict}
                      className="min-h-[44px] px-5"
                      onClick={() => handleChangeStep(step.id)}
                    >
                      {isActive ? '当前环节' : '切换到此环节'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </Card>
      </div>

      <ClassroomRosterPanel participants={currentSnapshot.participants} />
    </section>
  )
}

function MetricOrb({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-lowest p-2 text-primary shadow-ambient">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.6rem] font-semibold tracking-tight text-on-surface">{value}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>
    </div>
  )
}

function StageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-surface-container-lowest p-4 shadow-ambient">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function UtilityOrb({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex min-h-[88px] flex-col items-center justify-center gap-3 rounded-[1.3rem] bg-surface-container-low text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high">
      <span className="rounded-full bg-surface-container-lowest p-3 text-primary shadow-ambient">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
