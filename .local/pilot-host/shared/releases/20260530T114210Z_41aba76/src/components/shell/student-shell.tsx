import type { ReactNode } from 'react'

import { BookOpenCheck, Sparkles, Users2 } from 'lucide-react'

import { AuroraShell } from '@/components/shell/aurora-shell'
import { GlassNav } from '@/components/shell/glass-nav'
import { surfaceWidths } from '@/components/surfaces/surface-widths'
import { Badge } from '@/components/ui/badge'
import { studentNavigationItems } from '@/lib/navigation'

type StudentShellProps = {
  children: ReactNode
  themeSource: 'default' | 'active-theme'
}

const highlights = [
  { label: '学习进度', value: '实时同步', icon: BookOpenCheck },
  { label: '课堂状态', value: '低干扰沉浸', icon: Sparkles },
  { label: '协同模式', value: '师生共屏', icon: Users2 },
] as const

export function StudentShell({ children, themeSource }: StudentShellProps) {
  if (themeSource === 'default') {
    return (
      <div className="min-h-screen bg-surface px-4 pb-8 pt-4 text-on-surface sm:px-6 lg:px-8" data-theme-layout-source={themeSource}>
        <GlassNav items={studentNavigationItems} brandHref="/student" brandLabel="OpenLearn Next" />

        <div className={`${surfaceWidths.workspace} mt-5 flex flex-col gap-5`}>
          <div className="rounded-[var(--radius-shell)] bg-surface-container-low p-2 shadow-ambient sm:p-3">
            <div className="rounded-[calc(var(--radius-shell)-0.4rem)] bg-surface-container-lowest px-3 py-3 text-on-surface sm:px-4 sm:py-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuroraShell contentClassName="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <GlassNav
        items={studentNavigationItems}
        brandHref="/student"
        brandLabel="OpenLearn Next"
        inverse
      />

      <div className={`${surfaceWidths.workspace} mt-5 flex flex-col gap-5`} data-theme-layout-source={themeSource}>
        <section className="overflow-hidden rounded-[2rem] bg-white/8 px-5 py-6 shadow-[0_28px_80px_rgba(2,6,23,0.3)] ring-1 ring-white/10 backdrop-blur-2xl sm:px-6 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="bg-white/10 text-white">学生学习空间</Badge>
              <h1 className="mt-4 text-[2.3rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[3.4rem]">
                把学习进度、课堂节奏与个人任务放进同一块舞台
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                延续首页的新主题语言：深色 aurora 背景、玻璃导航和聚焦式信息层次。内部学习内容仍保留浅色 tonal surfaces，保证阅读与操作稳定。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
              {highlights.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-[1.4rem] bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/65">
                    <span className="rounded-full bg-white/10 p-2 text-cyan-200">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {label}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-[2rem] bg-surface-container-low/96 p-2 shadow-[0_28px_80px_rgba(2,6,23,0.18)] ring-1 ring-white/10 backdrop-blur-xl sm:p-3">
          <div className="rounded-[1.6rem] bg-surface-container-lowest px-3 py-3 text-on-surface sm:px-4 sm:py-4">
            {children}
          </div>
        </div>
      </div>
    </AuroraShell>
  )
}
