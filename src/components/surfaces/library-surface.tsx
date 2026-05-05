import { BookMarked, Search, UploadCloud, Link as LinkIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { courseCards } from '@/lib/demo-data'
import { ResourceCardDTO } from '@/lib/dto/resource-ai'

type LibrarySurfaceProps = {
  mode: 'courses' | 'resources'
  resources?: ResourceCardDTO[]
}

export function LibrarySurface({ mode, resources = [] }: LibrarySurfaceProps) {
  const isCourses = mode === 'courses'
  const title = isCourses ? '课程中心' : '资源中心'
  const action = isCourses ? '创建课程' : '登记链接资源'
  const eyebrow = isCourses ? '初中信息科技' : '教学资源中心'

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
            {isCourses ? <BookMarked className="size-5" aria-hidden /> : <LinkIcon className="size-5" aria-hidden />}
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
          {isCourses ? (
            courseCards.map((item) => (
              <Card key={item.title} className="min-h-56 bg-surface-container-lowest p-5">
                <Badge variant="default">{item.subject}</Badge>
                <h3 className="mt-5 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-4 leading-7 text-on-surface-variant">{`${item.subject} · ${item.lessons} · ${item.status}`}</p>
                <div className="mt-6 rounded-3xl bg-surface-container-low p-4 text-sm text-primary">
                  查看课程结构
                </div>
              </Card>
            ))
          ) : (
            resources.map((item) => (
              <Card key={item.id} className="min-h-56 bg-surface-container-lowest p-5">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="default">{item.classification}</Badge>
                  <Badge variant={item.ragEligible ? "success" : "default"}>
                    {item.ragEligible ? "可进入 RAG" : "RAG 未启用"}
                  </Badge>
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">可见性: {item.visibility} | 所有者: {item.ownerId}</p>
                {item.url && (
                  <p className="mt-2 text-sm text-blue-500 truncate">
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                  </p>
                )}
                <div className="mt-4 text-sm text-on-surface-variant">
                  <p>年级/学科: (暂无数据)</p>
                  <p>教材/版本: (暂无数据)</p>
                  <p>册/章/节: (暂无数据)</p>
                  <p>知识标签: (暂无数据)</p>
                </div>
                <div className="mt-6 rounded-3xl bg-surface-container-low p-4 text-sm text-primary">
                  查看资源详情
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
