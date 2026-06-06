import Link from "next/link";
import { ChevronRight, Sparkles, Store } from "lucide-react";

import { readMarketplaceSurfaceBundle } from "@/features/platform-core/actions/registry";
import { PluginMarketplaceDetailPanel } from "@/components/surfaces/plugin-marketplace-detail-panel";
import { StageHero } from "@/components/surfaces/stage-hero";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUserDTO, getCurrentUserSchoolIds } from "@/lib/dal/auth";

const postureLabel = {
  "not-installed": "未安装",
  "installed-usable": "已安装可用",
  "upgrade-available": "可升级",
  "retained-recoverable": "已卸载但可恢复",
  "active-blocked": "被 active classroom 阻断",
} as const;

export async function PluginMarketplaceSurface() {
  const [schoolIds, actor] = await Promise.all([getCurrentUserSchoolIds(), getCurrentUserDTO()]);
  const schoolId = schoolIds[0] ?? null;
  const actorId = actor?.id ?? null;
  const bundle = schoolId && actorId
    ? await readMarketplaceSurfaceBundle({ schoolId, actorId })
    : null;

  const builtInRows = bundle?.builtInRows ?? [];
  const externalRows = bundle?.externalRows ?? [];
  const metrics = bundle?.metrics ?? {
    builtInCount: 0,
    externalInstallableCount: 0,
    externalInstalledCount: 0,
    pendingUpgradeCount: 0,
  };

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className={`${surfaceWidths.workspace} flex flex-col gap-6`}>
        <StageHero
          badge="插件市场"
          title="可发现、可安装、风险透明的同页治理市场"
          description="/settings/plugins 现在同时承载 built-in 与 external 双分区。external 卡片先展示治理摘要，再展示安装、升级预检、retain / cleanup 与恢复动作。"
          meta={
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-white/10 text-white">单页双分区</Badge>
              <Badge className="bg-white/8 text-white/80">治理摘要先于主 CTA</Badge>
              <Badge className="bg-white/8 text-white/80">upgrade / uninstall 先预检</Badge>
            </div>
          }
          aside={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <MetricCard label="Built-in" value={String(metrics.builtInCount)} />
              <MetricCard label="External 可安装" value={String(metrics.externalInstallableCount)} />
              <MetricCard label="External 已安装" value={String(metrics.externalInstalledCount)} />
              <MetricCard label="待处理升级" value={String(metrics.pendingUpgradeCount)} />
            </div>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-6">
            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">External Section</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">治理优先的 external marketplace</h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                    先看版本、权限、声明数据、namespace 与 source，再决定安装、升级预检、保留卸载或恢复。失败与阻断都在卡片正文中原位回显。
                  </p>
                </div>

                <Link
                  href="/settings/labs"
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary shadow-ambient transition hover:bg-surface-container-lowest/90"
                >
                  前往实验室治理面
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {externalRows.map((row) => (
                  <article key={row.pluginKey} className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-on-surface">{row.displayName}</p>
                          <Badge className="bg-primary/10 text-primary">{postureLabel[row.posture]}</Badge>
                          {row.upgrade.available ? (
                            <Badge className="bg-surface-container-low text-on-surface">{row.currentVersion} -&gt; {row.availableVersion}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge className="bg-surface-container-low text-on-surface-variant">
                            Permissions: {row.requestedPermissions.length || "0"}
                          </Badge>
                          <Badge className="bg-surface-container-low text-on-surface-variant">
                            Data Model: {row.declaredDataTables.length || "0"}
                          </Badge>
                          <Badge className="bg-surface-container-low text-on-surface-variant">Namespace: {row.dbNamespace}</Badge>
                          <Badge className="bg-surface-container-low text-on-surface-variant">Source: {row.sourceType}</Badge>
                        </div>
                      </div>

                      <div className="rounded-full bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface-variant">
                        {row.currentVersion ? `当前 ${row.currentVersion}` : `目录 ${row.availableVersion}`}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                      {row.posture === "not-installed"
                        ? "受治理目录中的 external 插件。安装前先公开权限、数据声明与 namespace，避免 operator 先点后看风险。"
                        : row.posture === "upgrade-available"
                          ? "当前已有更高版本可用；默认先看 upgrade preflight，优先展示 blocker 与真实数据影响。"
                          : row.posture === "retained-recoverable"
                            ? "插件已卸载，但历史数据仍保留。重新安装后会以新 pluginId 接管原有保留数据。"
                            : row.posture === "active-blocked"
                              ? "当前 destructive 操作被 active classroom 硬阻断。先查看受影响课堂，再决定何时重试。"
                              : "当前版本已安装，可继续查看生命周期、upgrade preflight 或 retain / cleanup 影响面。"}
                    </p>

                    {row.installRejectReason ? (
                      <div className="mt-4 rounded-[1.25rem] bg-error-container px-4 py-4 text-sm leading-6 text-on-error-container">
                        具名拒因：{row.installRejectReason}
                      </div>
                    ) : null}

                    {row.activeSessions.length > 0 ? (
                      <div className="mt-4 rounded-[1.25rem] bg-error-container/70 px-4 py-4 text-sm leading-6 text-on-surface">
                        <p className="font-semibold text-on-surface">受影响课堂优先显示</p>
                        <p className="mt-2 text-on-surface-variant">
                          {row.activeSessions.length} 个 classroom/session 正在占用该插件；升级与卸载都会先被硬阻断。
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button variant="secondary" className="min-h-11 px-4 text-sm shadow-none">
                        {row.posture === "not-installed"
                          ? "安装插件"
                          : row.posture === "upgrade-available"
                            ? "查看升级预检"
                            : row.posture === "retained-recoverable"
                              ? "重新安装并恢复"
                              : row.posture === "active-blocked"
                                ? "查看受影响课堂"
                                : "查看详情"}
                      </Button>
                    </div>
                  </article>
                ))}

                {externalRows.length === 0 ? (
                  <div className="rounded-[1.75rem] bg-surface-container-lowest p-5 text-sm leading-7 text-on-surface-variant shadow-ambient lg:col-span-2">
                    当前还没有可安装的 external 插件。等待新的 external manifest 进入受治理目录后，这里会显示来源、权限、声明数据与安装入口。
                  </div>
                ) : null}
              </div>
            </section>

            {schoolId ? <PluginMarketplaceDetailPanel schoolId={schoolId} rows={externalRows} /> : null}

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">Built-in Section</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">系统内置教学环节</h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                    built-in 保持稳定可见，只提供启用 / 停用语义，不与 external 的安装、升级、卸载治理动作混淆。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {builtInRows.map((plugin) => (
                  <article key={plugin.id} className="rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-on-surface">{plugin.name}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge className="bg-primary/10 text-primary">系统内置</Badge>
                          {plugin.defaultEnabled ? (
                            <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge>
                          ) : null}
                          <Badge className="bg-surface-container-low text-on-surface-variant">Key: {plugin.pluginKey}</Badge>
                          <Badge className="bg-surface-container-low text-on-surface-variant">NS: {plugin.dbNamespace}</Badge>
                          <Badge className="bg-surface-container-low text-on-surface-variant">Type: {plugin.sourceType}</Badge>
                        </div>
                      </div>

                      <div className={plugin.enabled ? "rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary" : "rounded-full bg-surface-container-low px-3 py-1 text-sm font-medium text-on-surface-variant"}>
                        {plugin.enabled ? "运行中" : "已停用"}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                      系统提供的课堂教学环节，沿用 allowlisted action 与受控 hook 链路。这里仅保留可见性与启停，不提供 ownership 或删除语义。
                    </p>
                  </article>
                ))}

                {builtInRows.length === 0 ? (
                  <div className="rounded-[1.75rem] bg-surface-container-lowest p-5 text-sm leading-7 text-on-surface-variant shadow-ambient lg:col-span-2">
                    当前学校还没有可见的系统内置教学环节。完成 seed 或启用后，这里会显示系统内置目录与默认开启状态。
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="grid gap-4 self-start">
            <section className="rounded-[var(--radius-shell)] bg-surface-container-lowest p-5 shadow-ambient">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Store className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">市场规则</p>
                  <p className="mt-1 font-semibold text-on-surface">应用商店气质，但坚持治理优先</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                不展示评分、评论、付费等商店运营层元素；只展示 operator 做治理决策真正需要的版本、权限、数据声明、阻断与后续动作。
              </p>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">显示规则</p>
                  <p className="mt-1 font-semibold text-on-surface">摘要先于动作，风险先于 changelog</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-on-surface-variant">
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">external 卡片固定先展示 Version / Permissions / Data Model / Namespace / Source，再显示主操作。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">升级默认入口是“查看升级预检”，不是“开始升级”。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">active classroom 下只显示“查看受影响课堂”“稍后重试”，不出现 override。</li>
              </ul>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">返回设置</p>
              <div className="mt-4 grid gap-3">
                <MarketplaceLink href="/settings" title="系统设置首页" description="回到主题、通知与快捷入口总览。" />
                <MarketplaceLink href="/settings/labs" title="实验室布局管理" description="继续处理机房座位、设备与插件运行面。" />
                <MarketplaceLink href="/settings/labs" title="生命周期管理" description="返回 Labs 查看运行管理、紧急挂起与卸载前检查。" />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/14 px-5 py-4 backdrop-blur-sm">
      <p className="text-sm text-white/80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-white">{value}</p>
    </div>
  );
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
  );
}
