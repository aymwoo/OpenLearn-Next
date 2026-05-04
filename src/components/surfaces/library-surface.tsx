import { BookMarked, Search, UploadCloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { courseCards, resourceCards } from '@/lib/demo-data'

type LibrarySurfaceProps = {
  mode: 'courses' | 'resources'
}

export function LibrarySurface({ mode }: LibrarySurfaceProps) {
  const isCourses = mode === 'courses'
  const title = isCourses ? '课程中心' : '资源中心'
  const action = isCourses ? '创建课程' : '上传资源'
  const eyebrow = isCourses ? '初中信息科技' : '教学资源中心'
  const cards = isCourses
    ? courseCards.map((course) => ({
        title: course.title,
        badge: course.subject,
        description: `${course.subject} · ${course.lessons} · ${course.status}`,
        actionLabel: '查看课程结构',
      }))
    : resourceCards.map((resource) => ({
        title: resource.title,
        badge: resource.type,
        description: `${resource.subject} · ${resource.usage}`,
        actionLabel: '查看资源详情',
      }))

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <Badge variant="accent" className="mb-4 bg-surface-container-lowest">{eyebrow}</Badge>
            <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">{title}</h1>
            <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">
              {isCourses ? '围绕初中信息科技组织课程与课时外壳，方便后续接入真实编排流程。' : '集中查看变量小抄、Scratch 角色运动素材和课堂任务单等课堂支持材料。'}
            </p>
          </div>
          <Button className="gap-2 text-base">
            {isCourses ? <BookMarked className="size-5" aria-hidden /> : <UploadCloud className="size-5" aria-hidden />}
            {action}
          </Button>
        </div>
      </section>

      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm text-on-surface-variant">卡片式内容库</p>
            <h2 className="mt-2 text-2xl font-semibold">{isCourses ? '七年级编程基础' : '课堂资源'} · 可继续整理</h2>
          </div>
          <div className="flex min-h-12 items-center gap-3 rounded-full bg-surface-container-lowest px-5 text-on-surface-variant shadow-ambient">
            <Search className="size-5 text-primary" aria-hidden />
            <span className="text-sm">按主题、年级或用途筛选</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((item) => (
            <Card key={item.title} className="min-h-56 bg-surface-container-lowest p-5">
              <Badge variant="default">{item.badge}</Badge>
              <h3 className="mt-5 text-2xl font-semibold">{item.title}</h3>
              <p className="mt-4 leading-7 text-on-surface-variant">{item.description}</p>
              <div className="mt-6 rounded-3xl bg-surface-container-low p-4 text-sm text-primary">
                {item.actionLabel}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
