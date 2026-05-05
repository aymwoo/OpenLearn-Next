'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Radio } from 'lucide-react'
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
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
        
        {conflict && (
          <ClassroomConflictPanel 
            sessionId={currentSnapshot.sessionId} 
            onRefresh={() => setConflict(null)} 
          />
        )}

        <Badge variant="accent" className="mb-4 bg-surface-container-lowest">
          {currentSnapshot.className} · 课堂运行
        </Badge>
        <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
          {currentSnapshot.lessonTitle}
        </h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-on-surface-variant">当前步骤</p>
                <h2 className="mt-2 text-2xl font-semibold">{currentStep?.title}</h2>
              </div>
              <Radio className="size-6 text-primary" aria-hidden />
            </div>
            
            <div className="mt-6 space-y-2">
              <p className="text-sm text-on-surface-variant">所有步骤</p>
              {currentSnapshot.steps.map((step: any) => (
                <div key={step.id} className="flex justify-between items-center bg-surface-container-low p-3 rounded-md">
                  <span>{step.title}</span>
                  <Button 
                    variant={currentSnapshot.activeStepId === step.id ? "primary" : "secondary"}
                    disabled={currentSnapshot.activeStepId === step.id || isPending || !!conflict}
                    className="min-h-[44px]"
                    onClick={() => handleChangeStep(step.id, step.title)}
                  >
                    切换到此步骤
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <p className="text-sm text-on-surface-variant">课堂模式</p>
            <div className="mt-4 grid gap-3">
              <button 
                onClick={() => handleChangeMode(true)}
                disabled={isPending || !!conflict}
                className={`text-left rounded-3xl p-5 min-h-[44px] transition-colors duration-150 ${currentSnapshot.locked ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-low hover:bg-surface-container-low/80'}`}
              >
                <p className="text-2xl font-semibold">锁定跟随</p>
                <p className="mt-2 text-sm">学生端跟随教师当前步骤。</p>
              </button>
              <button 
                onClick={() => handleChangeMode(false)}
                disabled={isPending || !!conflict}
                className={`text-left rounded-3xl p-5 min-h-[44px] transition-colors duration-150 ${!currentSnapshot.locked ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-low hover:bg-surface-container-low/80'}`}
              >
                <p className="text-2xl font-semibold">自由浏览</p>
                <p className="mt-2 text-sm text-on-surface-variant">学生可回看已开放的步骤内容。</p>
              </button>
            </div>

            <div className="mt-8">
               <Button variant="secondary" className="w-full min-h-[48px] text-red-600" disabled={isPending || !!conflict} onClick={handleEndClassroom}>结束课堂</Button>
            </div>
          </Card>
        </div>
      </div>

      <ClassroomRosterPanel participants={currentSnapshot.participants} />
    </section>
  )
}
