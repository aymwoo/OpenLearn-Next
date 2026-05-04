import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function AdminSurface() {
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
        <Badge variant="default" className="mb-4 bg-surface-container-lowest">
          管理后台外壳
        </Badge>
        <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
          管理入口保持低强调展示
        </h1>
        <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">
          Phase 1 仅证明管理路由外壳存在，暂不展示未完成的组织配置或成员操作流程。
        </p>
      </section>

      <Card className="bg-surface-container-lowest p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="grid min-h-56 place-items-center rounded-[calc(var(--radius-shell)-0.75rem)] bg-surface-container-low p-8 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary-container/25 text-primary">
                <ShieldCheck className="size-7" aria-hidden />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">还没有可展示的课堂内容</h2>
              <p className="mt-4 leading-8 text-on-surface-variant">
                先从课程中心或资源中心熟悉课堂流程；准备好后即可创建自己的课程内容。
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">当前范围</p>
              <p className="mt-2 text-2xl font-semibold">路线证明与安全空状态</p>
            </div>
            <div className="rounded-3xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">下一步</p>
              <p className="mt-2 leading-7">后续权限、组织与内容治理会通过真实鉴权和 DAL 接入。</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
