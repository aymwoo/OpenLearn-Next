import Link from 'next/link'
import { ChevronRight, Sparkles, Store } from 'lucide-react'

import { listPluginsAction, setPluginEnabledAction } from '@/actions/plugin-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StageHero } from '@/components/surfaces/stage-hero'
import { surfaceWidths } from '@/components/surfaces/surface-widths'
import { getCurrentUserSchoolIds } from '@/lib/dal/auth'

export async function PluginMarketplaceSurface() {
  const schoolIds = await getCurrentUserSchoolIds()
  const schoolId = schoolIds[0] ?? null
  const pluginResult = schoolId ? await listPluginsAction({ schoolId }) : { success: true as const, data: [] }
  const plugins = (pluginResult.success ? pluginResult.data ?? [] : []).filter((plugin) => plugin.builtIn)

  const submitPluginToggle = async (formData: FormData) => {
    'use server'

    await setPluginEnabledAction({
      pluginId: String(formData.get('pluginId') ?? ''),
      schoolId: String(formData.get('schoolId') ?? ''),
      enabled: String(formData.get('enabled') ?? '') === 'true',
    })
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className={`${surfaceWidths.workspace} flex flex-col gap-6`}>
        <StageHero
          badge="插件市场"
          title="系统内置教学环节"
          description="在专用 marketplace 中查看学校当前可用的内置教学环节。它们由系统提供，默认开启，可按课堂运行需要停用或重新启用，但不会以删除动作呈现。"
          meta={
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/10 text-white">学校可见目录</Badge>
              <Badge className="bg-white/8 text-white/80">仅启用 / 停用，无删除语义</Badge>
            </div>
          }
          aside={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <MetricCard label="系统内置" value={String(plugins.length)} />
              <MetricCard label="当前启用" value={String(plugins.filter((plugin) => plugin.enabled).length)} />
            </div>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-on-surface-variant">内置目录</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">可见、可控、但不作为可删除扩展处理</h2>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                  所有卡片均来自当前安全 plugin registry 与学校范围启停状态。这里负责可见性与发现，不替代实验室中的运行管理面板。
                </p>
              </div>

              <Link
                href="/settings/labs"
                className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary shadow-ambient transition hover:bg-surface-container-lowest/90"
              >
                前往实验室管理
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {plugins.map((plugin) => (
                <article key={plugin.id} className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-on-surface">{plugin.name}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-primary/10 text-primary">系统内置</Badge>
                        {plugin.defaultEnabled ? (
                          <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge>
                        ) : null}
                        <Badge className="bg-surface-container-low text-on-surface-variant">{plugin.manifestJson.id}</Badge>
                      </div>
                    </div>

                    <div className={plugin.enabled ? 'rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary' : 'rounded-full bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface-variant'}>
                      {plugin.enabled ? '运行中' : '已停用'}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                    系统提供的课堂教学环节，沿用本地 allowlisted action 与受控 hook 链路。可停用以控制课堂使用面，但不会提供 ownership 或删除语义。
                  </p>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoTile label="默认状态" value={plugin.defaultEnabled ? '默认开启' : '默认关闭'} />
                    <InfoTile label="当前状态" value={plugin.enabled ? '已启用' : '未启用'} />
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <form action={submitPluginToggle}>
                      <input type="hidden" name="pluginId" value={plugin.id} />
                      <input type="hidden" name="schoolId" value={plugin.schoolId} />
                      <input type="hidden" name="enabled" value={plugin.enabled ? 'false' : 'true'} />
                      <Button variant="secondary" className="min-h-10 px-4 text-sm shadow-none">
                        {plugin.enabled ? '停用环节' : '重新启用'}
                      </Button>
                    </form>
                  </div>
                </article>
              ))}

              {plugins.length === 0 ? (
                <div className="rounded-[1.75rem] bg-surface-container-lowest p-5 text-sm leading-7 text-on-surface-variant shadow-ambient lg:col-span-2">
                  当前学校还没有可见的系统内置教学环节。完成 seed 或启用后，这里会显示系统内置目录与默认开启状态。
                </div>
              ) : null}
            </div>
          </div>

          <aside className="grid gap-4 self-start">
            <section className="rounded-[var(--radius-shell)] bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Store className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">发现入口</p>
                  <p className="mt-1 font-semibold text-on-surface">专用于可见性，不承载删除操作</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                marketplace 负责展示系统已交付的教学环节与默认状态；真正的实验室运维操作仍保留在 settings labs surface。
              </p>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">显示规则</p>
                  <p className="mt-1 font-semibold text-on-surface">内置标签先于次级元数据</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-on-surface-variant">
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">先展示“系统内置”“默认开启”，再展示 registry id。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">仅提供启用 / 停用切换，不展示删除按钮。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">停用后仍保留可见性，避免与第三方扩展混淆。</li>
              </ul>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">返回设置</p>
              <div className="mt-4 grid gap-3">
                <MarketplaceLink href="/settings" title="系统设置首页" description="回到主题、通知与快捷入口总览。" />
                <MarketplaceLink href="/settings/labs" title="实验室布局管理" description="继续处理机房座位、设备与插件运行面。" />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/14 px-5 py-4 backdrop-blur-sm">
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-low px-4 py-3">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="mt-1 font-medium text-on-surface">{value}</dd>
    </div>
  )
}

function MarketplaceLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 transition hover:bg-surface-container-lowest/90">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-on-surface">{title}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>
        <ChevronRight className="mt-1 size-4 text-primary" aria-hidden />
      </div>
    </Link>
  )
}
