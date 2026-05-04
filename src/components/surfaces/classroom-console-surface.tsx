import { Activity, MonitorUp, Radio, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { classroomParticipants, demoCourse, demoLesson, lessonSteps } from '@/lib/demo-data'

export function ClassroomConsoleSurface() {
  const currentStep = lessonSteps.find((step) => step.status === 'current') ?? lessonSteps[0]

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6 lg:hidden">
        <div className="flex items-center gap-3">
          <MonitorUp className="size-6 text-primary" aria-hidden />
          <p className="font-semibold">建议使用桌面端控课，当前为可读预览</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
          <Badge variant="accent" className="mb-4 bg-surface-container-lowest">
            {demoCourse.classLabel} · 课堂运行
          </Badge>
          <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[3rem]">
            {demoLesson.title}
          </h1>
          <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">
            当前正在讲授角色坐标，教师可以查看跟随状态并决定课堂节奏。
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <Card className="bg-surface-container-lowest p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-on-surface-variant">当前步骤</p>
                  <h2 className="mt-2 text-2xl font-semibold">{currentStep.title} · {currentStep.focus}</h2>
                </div>
                <Radio className="size-6 text-primary" aria-hidden />
              </div>
              <p className="mt-5 leading-8 text-on-surface-variant">{currentStep.description}</p>
              <div className="mt-6 rounded-3xl bg-surface-container-low p-5">
                <p className="text-sm text-on-surface-variant">同步状态</p>
                <p className="mt-2 font-semibold">课堂状态已同步，可继续控课</p>
              </div>
            </Card>

            <Card className="bg-surface-container-lowest p-5 sm:p-6">
              <p className="text-sm text-on-surface-variant">课堂模式</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-primary-container/25 p-5 text-primary">
                  <p className="text-2xl font-semibold">锁定跟随</p>
                  <p className="mt-2 text-sm">学生端跟随教师当前步骤。</p>
                </div>
                <div className="rounded-3xl bg-surface-container-low p-5">
                  <p className="text-2xl font-semibold">自由浏览</p>
                  <p className="mt-2 text-sm text-on-surface-variant">学生可回看已开放的步骤内容。</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="bg-surface-container-lowest p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UsersRound className="size-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">学生状态</h2>
          </div>
          <div className="mt-5 space-y-3">
            {classroomParticipants.map((participant) => (
              <div key={participant.name} className="rounded-3xl bg-surface-container-low p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{participant.name}</p>
                  <Badge variant={participant.status === '已跟随' ? 'success' : 'default'}>{participant.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">{participant.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl bg-surface-container-low p-5">
            <Activity className="mb-3 size-6 text-primary" aria-hidden />
            <p className="font-semibold">课堂节奏稳定</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">继续观察需关注学生，再进入练习环节。</p>
          </div>
        </Card>
      </section>
    </div>
  )
}
