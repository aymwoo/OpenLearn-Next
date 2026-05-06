import { Layers3, MonitorUp, Settings2, Sparkles, TimerReset } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AuthoringStatusPanel } from '@/components/authoring/authoring-status-panel'
import { LessonAuthoringWorkspace } from '@/components/authoring/lesson-authoring-workspace'
import type { LessonEditorDTO, TeacherAuthoringOverviewDTO } from '@/lib/dto/lesson-authoring'

type LessonEditorSurfaceProps = {
  overview: TeacherAuthoringOverviewDTO
  lesson: LessonEditorDTO | null
}

export function LessonEditorSurface({ overview, lesson }: LessonEditorSurfaceProps) {
  const activeCourse = lesson?.course ?? overview.courses[0]
  const activeLesson = lesson?.lesson ?? overview.lessons[0]
  const steps = lesson?.steps ?? []
  const activeStepCount = steps.filter((step) => !step.archivedAt).length

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient lg:hidden">
        <div className="flex items-center gap-3">
          <MonitorUp className="size-6 text-primary" aria-hidden />
          <p className="font-semibold">建议使用桌面端编辑，当前为可读预览</p>
        </div>
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-[0_16px_40px_rgba(44,47,49,0.05)] xl:grid xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:gap-4">
        <aside className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-on-surface-variant">课程 / 班级</p>
              <h1 className="mt-2 text-2xl font-semibold">{activeCourse?.title ?? '还没有课程'}</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                {activeCourse?.classLabels.join('、') || '尚未绑定班级'} · {activeCourse?.enrollmentCount ?? 0} 名学生
              </p>
            </div>
            <Layers3 className="size-6 text-primary" aria-hidden />
          </div>

          <div className="mt-5 rounded-3xl bg-surface-container-low p-4">
            <p className="text-sm text-on-surface-variant">课时列表</p>
            <div className="mt-3 space-y-2">
              {overview.lessons.length > 0 ? overview.lessons.map((item) => (
                <button key={item.id} className={`w-full rounded-3xl px-4 py-3 text-left ${activeLesson?.id === item.id ? 'bg-primary/8 text-primary' : 'bg-surface-container-lowest text-on-surface'}`}>
                  <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Lesson</span>
                  <span className="mt-2 block font-semibold">{item.title}</span>
                  <span className="mt-1 block text-sm text-on-surface-variant">修订 {item.revision} · {item.stepCount} 个步骤</span>
                </button>
              )) : <p className="text-sm text-on-surface-variant">还没有课时草稿</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-on-surface-variant">步骤编排</p>
            {steps.map((step, index) => (
              <button key={step.id} className="w-full rounded-3xl bg-surface-container-low p-4 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold">{step.title}</h2>
                    <p className="text-sm text-on-surface-variant">{step.type === 'content' ? '内容' : step.type === 'task' ? '任务' : '测验'} · {step.rank}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-3xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">
            将新的课堂步骤放在这里
          </div>
        </aside>

        <main className="mt-4 min-w-0 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="accent">{activeCourse?.subject ?? '课程'}</Badge>
                  <Badge variant="default" className="bg-surface-container-low">第 {activeLesson?.revision ?? 0} 次修订</Badge>
                </div>
                <h2 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">{activeLesson?.title ?? '课堂画布'}</h2>
              <p className="mt-3 max-w-2xl leading-8 text-on-surface-variant">
                {activeLesson?.objective ?? '创建第一个课时后，可以在这里编排内容、任务和测验步骤。'}
              </p>
            </div>
              <Badge variant="success">草稿仅教师可见</Badge>
            </div>

            <div className="rounded-[1.5rem] bg-linear-135 from-primary to-primary-container p-5 text-on-primary shadow-ambient">
              <p className="text-sm text-on-primary/80">当前编排焦点</p>
              <p className="mt-2 text-2xl font-semibold">{activeStepCount > 0 ? `${activeStepCount} 个有效步骤` : '等待新增第一个步骤'}</p>
              <p className="mt-3 text-sm leading-6 text-on-primary/85">保持导入、讲授、练习、总结的节奏层级，让课堂运行页能够直接读取同样的结构。</p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <EditorMetric label="步骤总数" value={String(activeStepCount)} icon={<Layers3 className="size-4" />} />
              <EditorMetric label="关联班级" value={String(activeCourse?.classLabels.length ?? 0)} icon={<Sparkles className="size-4" />} />
              <EditorMetric label="引用资料" value={String(lesson?.materials.length ?? 0)} icon={<Settings2 className="size-4" />} />
              <EditorMetric label="预计时长" value="45 分钟" icon={<TimerReset className="size-4" />} />
            </div>
          </div>

          <LessonAuthoringWorkspace overview={overview} lesson={lesson} />
        </main>

        <aside className="mt-4 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
          <div className="flex items-center gap-3">
            <Settings2 className="size-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">设置面板</h2>
          </div>
          <div className="mt-6 space-y-3">
            <MetaRow label="班级" value={activeCourse?.classLabels.join('、') || '未绑定'} />
            <MetaRow label="资源" value={`${lesson?.materials.length ?? 0} 个引用材料`} />
            <MetaRow label="发布状态" value={lesson?.publishState.latestVersion ? `第 ${lesson.publishState.latestVersion} 版 · 学生将读取已发布版本` : '草稿仅教师可见'} />
          </div>
          <div className="mt-6 rounded-3xl bg-surface-container-low p-5">
            <p className="text-sm text-on-surface-variant">发布前检查</p>
            <p className="mt-2 leading-7">发布课时前，请确认目标、步骤和引用材料已经形成学习闭环。</p>
          </div>
          <AuthoringStatusPanel lesson={lesson} />
          <span className="sr-only">已自动保存 检测到更新冲突</span>
        </aside>
      </section>
    </div>
  )
}

function EditorMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.35rem] bg-surface-container-low px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <span className="rounded-full bg-surface-container-lowest p-2 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.45rem] font-semibold text-on-surface">{value}</p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface-container-low p-4">
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  )
}
