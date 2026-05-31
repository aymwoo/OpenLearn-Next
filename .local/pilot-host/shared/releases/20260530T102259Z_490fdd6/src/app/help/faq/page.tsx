import Link from "next/link";
import { ArrowRight, Blocks, Compass, Palette, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { HelpFaqSurface } from "@/components/surfaces/help-faq-surface";
import {
  developerGuideCards,
  helpFaqContent,
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

export default function HelpFaqPage() {
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
                  常见问题与故障排除
                </h2>
                <p
                  className={cn(
                    surfaceWidths.heroBody,
                    "mt-4 text-sm leading-7 text-on-surface-variant sm:text-base",
                  )}
                >
                  快速定位并解决认证、课堂、课件、课表、插件与主题使用中的常见问题。如果下方没有找到答案，请联系管理员或查阅开发者指南。
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

        <HelpFaqSurface categories={helpFaqContent} />

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