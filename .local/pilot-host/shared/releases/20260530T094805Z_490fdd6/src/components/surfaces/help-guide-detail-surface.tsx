import Link from "next/link";
import { ArrowLeft, ArrowRight, FileCode2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import type { HelpGuidePage } from "@/lib/help/help-center-content";

const stateTone: Record<string, string> = {
  当前可用: "bg-primary/10 text-primary",
  使用边界: "bg-[#bc6c25]/12 text-[#bc6c25]",
  后续扩展: "bg-surface-container-low text-on-surface-variant",
};

export function HelpGuideDetailSurface({ guide }: { guide: HelpGuidePage }) {
  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-on-surface sm:px-6 lg:px-8">
      <div className={`${surfaceWidths.workspace} ${teacherSurfaceRhythm.stack}`}>
        <section className={teacherSurfaceRhythm.sectionCompact}>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium text-primary transition hover:bg-surface-container-low"
          >
            <ArrowLeft className="size-4" aria-hidden />
            返回帮助中心
          </Link>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className={teacherSurfaceRhythm.hero}>
              <div className={teacherSurfaceRhythm.heroInset}>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary">当前可用</Badge>
                  <Badge className="bg-surface-container-low text-on-surface-variant">开发者详细页</Badge>
                </div>
                <h2 className="mt-4 text-[2.3rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.8rem]">
                  {guide.title}
                </h2>
                <p className="mt-4 max-w-[44rem] text-sm leading-7 text-on-surface-variant sm:text-base">
                  {guide.summary}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.35rem] bg-surface-container-low px-4 py-4">
                    <p className="text-sm text-on-surface-variant">适合谁读</p>
                    <p className="mt-2 text-sm leading-7 text-on-surface">{guide.audience}</p>
                  </div>
                  <div className="rounded-[1.35rem] bg-surface-container-low px-4 py-4">
                    <p className="text-sm text-on-surface-variant">事实来源</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {guide.factSources.map((source) => (
                        <span key={source} className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs text-on-surface-variant">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {guide.sections.map((section) => (
              <section key={section.title} className={teacherSurfaceRhythm.section}>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-on-surface">{section.title}</h3>
                  {section.stateLabel ? (
                    <Badge className={stateTone[section.stateLabel]}>{section.stateLabel}</Badge>
                  ) : null}
                </div>

                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-on-surface-variant sm:text-base">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets ? (
                    <ul className="grid gap-3 text-sm leading-7 text-on-surface-variant">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.codeExample ? (
                    <div className="rounded-[1.6rem] bg-slate-950 p-5 text-slate-100 shadow-ambient">
                      <div className="flex items-center gap-3 text-slate-300">
                        <FileCode2 className="size-4" aria-hidden />
                        <p className="text-sm font-medium">{section.codeExample.title}</p>
                      </div>
                      <pre className="mt-4 overflow-x-auto rounded-[1.1rem] bg-slate-900/80 p-4 text-xs leading-6 text-slate-100">
                        <code>{section.codeExample.code}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <aside className="grid gap-4 self-start">
            <section className={teacherSurfaceRhythm.sectionCompact}>
              <p className="text-sm text-on-surface-variant">本页覆盖</p>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-on-surface-variant">
                {guide.coverage.map((item) => (
                  <li key={item} className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className={teacherSurfaceRhythm.sectionCompact}>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-[#bc6c25]/12 text-[#bc6c25]">
                  <ShieldAlert className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-on-surface-variant">不要误用</p>
                  <p className="mt-1 font-semibold text-on-surface">这些限制仍然生效</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-3 text-sm leading-7 text-on-surface-variant">
                {guide.caution.map((item) => (
                  <li key={item} className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className={teacherSurfaceRhythm.sectionCompact}>
              <p className="text-sm text-on-surface-variant">相关页面</p>
              <div className="mt-4 grid gap-3">
                {guide.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4 transition hover:bg-surface-container-low"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-on-surface">{link.label}</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{link.summary}</p>
                      </div>
                      <ArrowRight className="mt-1 size-4 text-primary" aria-hidden />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
