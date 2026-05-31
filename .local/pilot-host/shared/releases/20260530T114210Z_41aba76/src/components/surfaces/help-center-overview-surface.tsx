import Link from "next/link";
import { ArrowRight, Blocks, Compass, Palette, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import {
  developerGuideCards,
  helpStateNotes,
  teacherHelpModules,
} from "@/lib/help/help-center-content";
import { cn } from "@/lib/utils";

const splitCards = [
  {
    title: "我是教师",
    summary:
      "先看当前能在哪里启停插件、切换主题、理解课表扩展边界；这里不进入代码与 schema 细节。",
    icon: Compass,
  },
  {
    title: "我是开发者",
    summary:
      "直接进入插件、主题、Actions / Interfaces 三个详细页，按当前实现理解 contract、runtime 和安全边界。",
    icon: Blocks,
  },
] as const;

const stateTone: Record<string, string> = {
  当前可用: "bg-primary/10 text-primary",
  使用边界: "bg-[#bc6c25]/12 text-[#bc6c25]",
  后续扩展: "bg-surface-container-lowest text-on-surface-variant",
};

export function HelpCenterOverviewSurface() {
  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className={`${surfaceWidths.workspace} ${teacherSurfaceRhythm.stack}`}>
        <section className={teacherSurfaceRhythm.hero}>
          <div className={teacherSurfaceRhythm.heroInset}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className={surfaceWidths.heroTitle}>
                <p className="text-sm uppercase tracking-[0.18em] text-on-surface-variant">
                  Help center
                </p>
                <h2 className="mt-4 text-[2.4rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.9rem]">
                  在产品内找到教师使用说明与开发接入指南
                </h2>
                <p
                  className={cn(
                    surfaceWidths.heroBody,
                    "mt-4 text-sm leading-7 text-on-surface-variant sm:text-base",
                  )}
                >
                  帮助中心以当前代码实现、DAL 和 Server Actions 为事实来源。首页先完成教师 /
                  开发者分流，再把插件、主题和 schedule 扩展指南拆到独立子页，避免你在产品页和散落文档之间来回跳转。
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:max-w-[24rem] lg:justify-end">
                {helpStateNotes.map((note) => (
                  <div key={note.label} className="rounded-[1.5rem] bg-surface-container-low px-4 py-3 shadow-ambient">
                    <Badge className={stateTone[note.label]}>{note.label}</Badge>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{note.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {splitCards.map(({ title, summary, icon: Icon }) => (
            <article key={title} className={teacherSurfaceRhythm.section}>
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">受众分流</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-on-surface">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant sm:text-base">
                    {summary}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className={teacherSurfaceRhythm.section}>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">教师帮助</p>
                <h3 className="mt-1 text-xl font-semibold text-on-surface">先看当前去哪里做事</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {teacherHelpModules.map((module) => (
                <article key={module.title} className={`${teacherSurfaceRhythm.cardInset} p-5`}>
                  <h4 className="text-lg font-semibold text-on-surface">{module.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{module.summary}</p>
                  <Button asChild variant="secondary" className="mt-4 min-h-10 px-4 text-sm shadow-none">
                    <Link href={module.href}>{module.cta}</Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>

          <aside className="grid gap-4 self-start">
            <section className={teacherSurfaceRhythm.sectionCompact}>
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">教师区约束</p>
                  <p className="mt-1 font-semibold text-on-surface">这里只讲使用路径与当前边界</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-on-surface-variant">
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">不放代码块，不展开 schema 和 hook 术语。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">优先说明真实入口，比如系统设置、插件市场和教师课表。</li>
                <li className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">底层 contract 统一进入开发者子页继续阅读。</li>
              </ul>
            </section>
          </aside>
        </section>

        <section className={teacherSurfaceRhythm.section}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <Palette className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">开发者指南</p>
              <h3 className="mt-1 text-xl font-semibold text-on-surface">进入三个正式详细页</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {developerGuideCards.map((guide) => (
              <article key={guide.href} className={`${teacherSurfaceRhythm.cardInset} flex h-full flex-col p-5`}>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary">当前可用</Badge>
                  {guide.includesCodeExamples ? (
                    <Badge className="bg-surface-container-low text-on-surface-variant">包含代码示例</Badge>
                  ) : null}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-on-surface">{guide.title}</h4>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">{guide.summary}</p>
                <ul className="mt-4 grid gap-2 text-sm text-on-surface-variant">
                  {guide.coverage.map((item) => (
                    <li key={item} className="rounded-[1.1rem] bg-surface-container-low px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-5 w-full gap-2 text-sm">
                  <Link href={guide.href}>
                    进入详细页
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {helpStateNotes.map((note) => (
            <article key={note.label} className={teacherSurfaceRhythm.sectionCompact}>
              <Badge className={stateTone[note.label]}>{note.label}</Badge>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">{note.summary}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
