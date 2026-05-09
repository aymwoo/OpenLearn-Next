import Link from 'next/link'
import {
  Bell,
  ChevronRight,
  Cpu,
  Globe,
  Palette,
  Lock,
  Shield,
  SunMedium,
} from 'lucide-react'

import { listPluginsAction, setPluginEnabledAction } from '@/actions/plugin-actions'
import { setActiveThemeAction } from '@/actions/theme-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentUserSchoolIds } from '@/lib/dal/auth'
import { getValidThemesForSchool } from '@/lib/dal/themes'
import { getActiveThemeId } from '@/lib/theme-cookie'

type SettingsSurfaceProps = {
  mode: 'general' | 'labs'
}

const settingsSections = [
  { label: '通用', icon: SunMedium },
  { label: '安全', icon: Shield },
  { label: '通知', icon: Bell },
  { label: '隐私', icon: Lock },
  { label: '语言', icon: Globe },
  { label: '关于', icon: Cpu },
] as const

const labRows = ['A', 'B', 'C', 'D', 'E', 'F'] as const
const labColumns = Array.from({ length: 8 }, (_, index) => index + 1)

export async function SettingsSurface({ mode }: SettingsSurfaceProps) {
  const schoolIds = await getCurrentUserSchoolIds()
  const schoolId = schoolIds[0] ?? null

  if (mode === 'labs') {
    return <LabsSettingsSurface schoolId={schoolId} />
  }

  return <GeneralSettingsSurface schoolId={schoolId} />
}

async function GeneralSettingsSurface({ schoolId }: { schoolId: string | null }) {
  const themes = schoolId ? await getValidThemesForSchool(schoolId) : []
  const activeThemeId = await getActiveThemeId()
  const resetTheme = async (formData: FormData) => {
    'use server'

    await setActiveThemeAction(formData)
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1280px] gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
          <div className="rounded-[1.5rem] bg-surface-container-lowest p-5">
            <p className="text-sm text-on-surface-variant">开放学习</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">系统设置</h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">管理系统界面、通知和实验室模块的使用偏好。</p>
          </div>

          <nav className="mt-5 grid gap-3">
            {settingsSections.map((section, index) => {
              const Icon = section.icon
              return (
                <div
                  key={section.label}
                  className={index === 0 ? 'flex items-center gap-3 rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-primary shadow-ambient' : 'flex items-center gap-3 rounded-[1.5rem] bg-surface-container-lowest/75 px-4 py-4 text-on-surface-variant'}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="font-medium">{section.label}</span>
                </div>
              )
            })}
          </nav>

          <Link href="/settings/labs" className="mt-5 flex items-center justify-between rounded-[1.5rem] bg-surface-container-lowest px-5 py-4 text-on-surface shadow-ambient transition hover:bg-surface-container-lowest/90">
            <div>
              <p className="text-sm text-on-surface-variant">扩展模块</p>
              <p className="mt-1 font-semibold">进入实验室布局管理</p>
            </div>
            <ChevronRight className="size-5 text-primary" aria-hidden />
          </Link>

          <Link href="/settings/plugins" className="flex items-center justify-between rounded-[1.5rem] bg-surface-container-lowest px-5 py-4 text-on-surface shadow-ambient transition hover:bg-surface-container-lowest/90">
            <div>
              <p className="text-sm text-on-surface-variant">插件市场</p>
              <p className="mt-1 font-semibold">查看系统内置教学环节</p>
            </div>
            <ChevronRight className="size-5 text-primary" aria-hidden />
          </Link>

        </aside>

        <section className="space-y-6">
          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="accent" className="bg-surface-container-lowest">通用设置</Badge>
                <h2 className="mt-4 text-[2.2rem] font-semibold tracking-[-0.02em]">管理系统界面与基础功能偏好</h2>
                <p className="mt-3 leading-8 text-on-surface-variant">以大面积 tonal surface 替代硬分割线，统一浅色、深色和自动模式，确保教师与学生界面风格一致。</p>
              </div>
              <Button className="text-base">保存更改</Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Palette className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">外观</p>
                  <h3 className="mt-2 text-lg font-semibold text-on-surface">主题切换</h3>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">通过学校范围内的有效主题切换课堂界面，或恢复默认主题。</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <form
                  action={resetTheme}
                  className={activeThemeId ? 'rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient' : 'rounded-[1.5rem] border-2 border-primary bg-surface-container-lowest p-5 shadow-ambient'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-on-surface">默认主题</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface-variant">清除当前 `activeThemeId`，恢复系统默认外观。</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!activeThemeId ? <Badge className="bg-primary text-white">当前使用中</Badge> : null}
                      <SunMedium className="size-5 text-primary" aria-hidden />
                    </div>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-on-surface-variant">柔和浅色 tonal layer，适合日常备课与系统默认浏览。</p>
                  <Button variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">恢复默认</Button>
                </form>

                {themes.map((theme) => (
                  <form
                    key={theme.id}
                    action={resetTheme}
                    className={
                      activeThemeId === theme.id
                        ? 'rounded-[1.5rem] border-2 border-primary bg-surface-container-lowest p-5 shadow-ambient'
                        : 'rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient'
                    }
                  >
                    <input type="hidden" name="themeId" value={theme.id} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-on-surface">{theme.name}</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {theme.name.includes('星夜')
                            ? '偏深色夜空语义，强化蓝紫主色与沉浸式课堂氛围。'
                            : '已通过校验，可作为当前学校的界面主题使用。'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeThemeId === theme.id ? <Badge className="bg-primary text-white">当前使用中</Badge> : null}
                        <Badge className="bg-surface-container-low text-on-surface-variant">有效主题</Badge>
                      </div>
                    </div>
                    <Button variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">应用主题</Button>
                  </form>
                ))}

                {themes.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 text-sm leading-6 text-on-surface-variant">
                    当前学校还没有可用主题。启用带有 `manifest.theme` 的插件后，这里会显示可选项。
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-lowest p-5 shadow-ambient sm:p-6">
              <p className="text-sm text-on-surface-variant">快捷入口</p>
              <div className="mt-4 grid gap-3">
                <QuickLink href="/settings/plugins" title="插件市场" description="浏览系统内置教学环节与默认开启状态。" />
                <QuickLink href="/settings/labs" title="实验室布局管理" description="配置 204 机房座位、设备和在线状态。" />
                <QuickLink href="/teacher/students" title="学生管理" description="进入学生名册，继续批量导入与状态核对。" />
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PreferenceCard
              title="通知设置"
              items={[
                ['电子邮件通知', '接收关于课程更新和系统活动的邮件。'],
                ['移动端推送通知', '在移动设备上接收即时消息。'],
                ['站内消息提醒', '在平台内部显示红点或弹窗提醒。'],
              ]}
            />
            <PreferenceCard
              title="隐私"
              items={[
                ['所有人可见', '适合公开课和公开教研活动。'],
                ['仅联系人可见', '推荐给校内协作教师。'],
                ['仅自己可见', '适合个人备课与测试。'],
              ]}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

async function LabsSettingsSurface({ schoolId }: { schoolId: string | null }) {
  const pluginResult = schoolId ? await listPluginsAction({ schoolId }) : { success: true as const, data: [] }
  const plugins = pluginResult.success ? (pluginResult.data ?? []) : []
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
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-6">
        <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="accent" className="bg-surface-container-lowest">实验室布局管理</Badge>
              <h1 className="mt-4 text-[2.3rem] font-semibold tracking-[-0.02em]">204 机房</h1>
              <p className="mt-3 leading-8 text-on-surface-variant">面向高密度机房的座位布局、设备状态和批量操作面板。保留大块留白和 tonal layering，避免传统表格分割线。</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="text-base shadow-none">自动分配</Button>
              <Button className="text-base">保存布局</Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
            <div className="rounded-[1.5rem] bg-surface-container-lowest p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-on-surface-variant">讲台区域</p>
                  <h2 className="mt-2 text-2xl font-semibold">教师主控与学生终端布局</h2>
                </div>
                <Link href="/settings" className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium text-primary">返回设置中心</Link>
              </div>

              <div className="mt-6 rounded-[1.5rem] bg-surface-container-low p-4 sm:p-5">
                <div className="mb-4 rounded-[1.25rem] bg-surface-container-lowest p-4 text-center text-sm font-semibold text-primary shadow-ambient">讲台区域</div>
                <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {labRows.flatMap((row, rowIndex) =>
                    labColumns.map((column, columnIndex) => {
                      const status = rowIndex === 0 && columnIndex === 3 ? 'fault' : rowIndex === 5 && columnIndex > 5 ? 'idle' : 'online'
                      const label = `${row}-${String(column).padStart(2, '0')}`
                      return <SeatCard key={label} label={label} status={status} />
                    }),
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-4 self-start">
            <section className="rounded-[var(--radius-shell)] bg-surface-container-lowest p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">状态概览</p>
              <div className="mt-4 grid gap-4">
                {[
                  ['总座位数', '48'],
                  ['在线状态', '42'],
                  ['离线 / 空闲', '4'],
                  ['设备维护', '2'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.5rem] bg-surface-container-low p-4">
                    <p className="text-sm text-on-surface-variant">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">图例说明</p>
              <div className="mt-4 grid gap-3">
                <LegendItem label="学生已登录在线" tone="bg-primary/15 text-primary" />
                <LegendItem label="空闲未分配" tone="bg-surface-container-lowest text-on-surface-variant" />
                <LegendItem label="设备故障报修" tone="bg-[#fff2df] text-[#bc6c25]" />
              </div>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <p className="text-sm text-on-surface-variant">快速操作</p>
              <div className="mt-4 grid gap-3">
                <button className="rounded-[1.5rem] bg-surface-container-lowest px-4 py-4 text-left font-medium text-on-surface shadow-ambient">导出考勤报告</button>
                <button className="rounded-[1.5rem] bg-[#fff1f2] px-4 py-4 text-left font-medium text-[#b31b25] shadow-ambient">一键关机全实验室</button>
              </div>
            </section>

            <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-on-surface-variant">插件管理</p>
                  <p className="mt-2 text-lg font-semibold text-on-surface">按学校启停安全插件</p>
                </div>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">实验室</Badge>
              </div>

              <div className="mt-4 grid gap-3">
                {plugins.map((plugin) => (
                  <div key={plugin.id} className="rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-on-surface">{plugin.name}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {plugin.builtIn ? (
                            <Badge className="bg-primary/10 text-primary">系统内置</Badge>
                          ) : null}
                          {plugin.defaultEnabled ? (
                            <Badge className="bg-surface-container-low text-on-surface">默认开启</Badge>
                          ) : null}
                          <Badge className="bg-surface-container-low text-on-surface-variant">{plugin.manifestJson.id}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {plugin.enabled ? '已启用' : '未启用'} · {plugin.killSwitchEnabled ? '总开关已开启' : '总开关已关闭'}
                        </p>
                        {plugin.builtIn ? (
                          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                            该教学环节由系统提供，可停用但不可删除。
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={submitPluginToggle}>
                        <input type="hidden" name="pluginId" value={plugin.id} />
                        <input type="hidden" name="schoolId" value={plugin.schoolId} />
                        <input type="hidden" name="enabled" value={plugin.enabled ? 'false' : 'true'} />
                        <Button variant="secondary" className="min-h-10 px-4 text-sm shadow-none">
                          {plugin.builtIn
                            ? plugin.enabled
                              ? '停用环节'
                              : '重新启用'
                            : plugin.enabled
                              ? '停用插件'
                              : '启用插件'}
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}

                {plugins.length === 0 ? (
                  <div className="rounded-[1.5rem] bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                    当前学校尚未注册插件。完成插件注册后，这里会显示启用状态与总开关状态。
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}

function PreferenceCard({ title, items }: { title: string; items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6">
      <p className="text-sm text-on-surface-variant">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.map(([label, description], index) => (
          <div key={label} className={index === 0 ? 'rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient' : 'rounded-[1.5rem] bg-surface-container-lowest/80 p-4'}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-on-surface">{label}</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
              </div>
              <span className={index === 0 ? 'h-6 w-11 rounded-full bg-primary/15 p-1' : 'h-6 w-11 rounded-full bg-surface'}>
                <span className={index === 0 ? 'block h-4 w-4 rounded-full bg-primary translate-x-5' : 'block h-4 w-4 rounded-full bg-on-surface-variant/30'} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 transition hover:bg-surface-container-lowest/80">
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

function SeatCard({ label, status }: { label: string; status: 'online' | 'idle' | 'fault' }) {
  const tone =
    status === 'online'
      ? 'bg-primary/10 text-primary'
      : status === 'fault'
        ? 'bg-[#fff2df] text-[#bc6c25]'
        : 'bg-surface-container-lowest text-on-surface-variant'

  return (
    <div className={`rounded-[1.25rem] px-3 py-4 text-center shadow-ambient ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em]">座位</p>
      <p className="mt-2 text-lg font-semibold">{label}</p>
    </div>
  )
}

function LegendItem({ label, tone }: { label: string; tone: string }) {
  return (
    <div className={`rounded-[1.5rem] px-4 py-4 text-sm font-medium ${tone}`}>{label}</div>
  )
}
