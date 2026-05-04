import { BookOpenCheck, Clock3, Layers3, MonitorUp, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { demoCourse, demoLesson, lessonSteps, resourceCards } from '@/lib/demo-data'

export function LessonEditorSurface() {
  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient lg:hidden">
        <div className="flex items-center gap-3">
          <MonitorUp className="size-6 text-primary" aria-hidden />
          <p className="font-semibold">建议使用桌面端编辑，当前为可读预览</p>
        </div>
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient xl:grid xl:grid-cols-[280px_minmax(0,1fr)_300px] xl:gap-4">
        <aside className="rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-on-surface-variant">课时大纲</p>
              <h1 className="mt-2 text-2xl font-semibold">{demoLesson.title}</h1>
              <p className="mt-2 text-sm text-on-surface-variant">导入 / 讲授 / 练习 / 总结</p>
            </div>
            <Layers3 className="size-6 text-primary" aria-hidden />
          </div>

          <div className="mt-6 space-y-3">
            {lessonSteps.map((step, index) => (
              <div key={step.id} className="rounded-3xl bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-surface-container-lowest text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="font-semibold">{step.title}</h2>
                    <p className="text-sm text-on-surface-variant">{step.duration} · {step.focus}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl bg-surface-container-low p-5 text-center text-sm text-on-surface-variant">
            将新的课堂步骤放在这里
          </div>
        </aside>

        <main className="mt-4 min-w-0 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <Badge variant="accent" className="mb-4">{demoCourse.subject}</Badge>
              <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em]">课堂画布</h2>
              <p className="mt-3 max-w-2xl leading-8 text-on-surface-variant">{demoLesson.objective}</p>
            </div>
            <Badge variant="success">{demoLesson.mode}</Badge>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <Card className="bg-surface-container-low p-5 shadow-none">
              <div className="flex items-center gap-3">
                <BookOpenCheck className="size-6 text-primary" aria-hidden />
                <h3 className="text-2xl font-semibold">讲授活动</h3>
              </div>
              <p className="mt-4 leading-8 text-on-surface-variant">
                用舞台坐标示意图说明角色移动的方向和距离，再让学生预测下一条指令执行后的角色位置。
              </p>
              <div className="mt-5 rounded-3xl bg-surface-container-lowest p-5">
                <p className="text-sm text-on-surface-variant">教师提示</p>
                <p className="mt-2 font-semibold">先问“如果 x 增加 20，角色会往哪里移动？”再展示脚本运行。</p>
              </div>
            </Card>

            <Card className="bg-surface-container-low p-5 shadow-none">
              <div className="flex items-center gap-3">
                <Clock3 className="size-6 text-primary" aria-hidden />
                <h3 className="text-2xl font-semibold">练习安排</h3>
              </div>
              <p className="mt-4 leading-8 text-on-surface-variant">
                学生完成“让角色走到目标点并说出提示语”，提交截图和一句调试说明。
              </p>
              <div className="mt-5 grid gap-3">
                {resourceCards.map((resource) => (
                  <div key={resource.title} className="rounded-3xl bg-surface-container-lowest p-4">
                    <p className="font-semibold">{resource.title}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{resource.usage}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>

        <aside className="mt-4 rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-lowest p-5 xl:mt-0">
          <div className="flex items-center gap-3">
            <Settings2 className="size-6 text-primary" aria-hidden />
            <h2 className="text-2xl font-semibold">设置面板</h2>
          </div>
          <div className="mt-6 space-y-3">
            <MetaRow label="班级" value={demoCourse.classLabel} />
            <MetaRow label="时长" value={demoLesson.duration} />
            <MetaRow label="资源" value="变量小抄、素材、任务单" />
            <MetaRow label="课堂模式" value={demoLesson.mode} />
          </div>
          <div className="mt-6 rounded-3xl bg-surface-container-low p-5">
            <p className="text-sm text-on-surface-variant">发布前检查</p>
            <p className="mt-2 leading-7">目标、活动、资源和课堂模式已在画布中形成闭环。</p>
          </div>
        </aside>
      </section>
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
