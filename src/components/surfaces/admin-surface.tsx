import { ShieldCheck, Cpu, Box, PaintRoller } from 'lucide-react'
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
          安全边界与注册表
        </h1>
        <p className="mt-4 max-w-2xl leading-8 text-on-surface-variant">
          仅显示系统扩展能力的安全约束。暂无真实模型调用。
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-surface-container-lowest p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-primary">
              <Cpu className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">AI与知识库</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="font-medium">Agent 能力注册</p>
              <p className="text-sm text-on-surface-variant mt-1">
                模型与 Provider 接入解耦，通过 MCP credentialRef 绑定私有凭证。
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="font-medium">RAG 检索</p>
              <p className="text-sm text-on-surface-variant mt-1">
                建立 Qdrant-ready 过滤边界，保护校本与私人数据不越界。
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-surface-container-lowest p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-primary">
              <Box className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">插件系统安全</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-container-low p-4">
              <p className="font-medium">安全清单</p>
              <p className="text-sm text-on-surface-variant mt-1">
                通过声明式 manifest 注册，仅允许调用系统 allowlist action。
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">紧急控制</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  内置 kill-switch，快速禁用危险插件。
                </p>
              </div>
              <ShieldCheck className="size-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="bg-surface-container-lowest p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid size-10 place-items-center rounded-full bg-primary-container/25 text-primary">
              <PaintRoller className="size-5" />
            </div>
            <h2 className="text-xl font-semibold">主题与视觉</h2>
          </div>
          <div className="rounded-2xl bg-surface-container-low p-4">
            <p className="font-medium">主题引擎</p>
            <p className="text-sm text-on-surface-variant mt-1">
              不提供直接注入样式表的功能。所有设计映射至严格受控的 CSS 变量，确保产品视觉底线。
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
