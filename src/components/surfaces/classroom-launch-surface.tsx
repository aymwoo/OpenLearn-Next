import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  PlayCircle,
  RadioTower,
  UsersRound,
} from "lucide-react";

import { ClassroomLaunchPanel } from "@/components/classroom/classroom-launch-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { surfaceWidths } from "@/components/surfaces/surface-widths";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { ClassroomConsoleDTO } from "@/lib/dto/classroom";
import { cn } from "@/lib/utils";

type ClassroomLaunchSurfaceProps = {
  consoleData: ClassroomConsoleDTO;
};

const formatter = new Intl.DateTimeFormat("zh-CN", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ClassroomLaunchSurface({
  consoleData,
}: ClassroomLaunchSurfaceProps) {
  const classCount = new Set(
    consoleData.publishedLessons.flatMap((lesson) =>
      lesson.classes.filter((item) => item.studentCount > 0).map((item) => item.id),
    ),
  ).size;

  return (
    <div
      className={cn(
        surfaceWidths.workspace,
        teacherSurfaceRhythm.stack,
        "p-4 sm:p-5 lg:p-6",
      )}
    >
      <section
        className={cn(
          "overflow-hidden bg-surface-container-low",
          teacherSurfaceRhythm.shell,
        )}
      >
        <div
          className={cn(
            "bg-linear-135 from-primary to-primary-container text-on-primary",
            teacherSurfaceRhythm.gradientHeroContent,
          )}
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className={surfaceWidths.heroTitle}>
              <Badge variant="accent" className="bg-white/15 text-white">
                课堂启动准备页
              </Badge>
              <h1 className="mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">
                开启新课堂
              </h1>
              <p
                className={cn(
                  surfaceWidths.heroBody,
                  "mt-3 text-sm leading-7 text-on-primary/85 sm:text-base sm:leading-8",
                )}
              >
                先确认已发布课时、整班名册与课堂节奏，再进入运行台。若当前已有 live
                classroom，可从右侧次级恢复区继续上课，但不会压过新开课堂主动作。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[28rem]">
              <HeroMetric
                icon={<PlayCircle className="size-4" aria-hidden />}
                label="可开课时"
                value={String(consoleData.publishedLessons.length)}
                detail="仅展示可直接启动的已发布课时"
              />
              <HeroMetric
                icon={<UsersRound className="size-4" aria-hidden />}
                label="可用班级"
                value={String(classCount)}
                detail="已绑定可选名册"
              />
              <HeroMetric
                icon={<RadioTower className="size-4" aria-hidden />}
                label="进行中的课堂"
                value={String(consoleData.liveSessions.length)}
                detail="继续上课保持次级呈现"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <ClassroomLaunchPanel
          publishedLessons={consoleData.publishedLessons}
          emptyStateCopy={consoleData.emptyStateCopy}
          launchPreviewEmptyState={consoleData.launchPreviewEmptyState}
          successHref="/classroom"
          title="新课堂准备"
          description="从已发布课时中选择本次课堂内容，并指定要同步进入课堂的整班名单。主舞台会同步展示 class-facing run sheet，帮助你在启动前确认节奏、材料与采证提醒。"
          ctaLabel="开启新课堂"
        />

        <div className="space-y-4">
          <Card className="bg-surface-container-low p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">
                  继续正在运行的课堂
                </p>
                <h2 className="mt-2 text-xl font-semibold text-on-surface">
                  恢复 live classroom
                </h2>
              </div>
              <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs font-medium text-on-surface-variant shadow-ambient">
                次级恢复区
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              已有 live classroom
              时，这里会保留继续上课入口与当前状态摘要；如果没有正在运行的课堂，也会明确提示你直接开始新课堂。
            </p>

            <div className="mt-4 grid gap-3">
              {consoleData.liveSessions.length > 0 ? (
                consoleData.liveSessions.map((session) => (
                  <article
                    key={session.id}
                    className={cn(teacherSurfaceRhythm.cardInset, "p-4")}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">进行中</Badge>
                      <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
                        {session.locked ? "锁定跟随" : "自由浏览"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-on-surface">
                      {session.lessonTitle}
                    </h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {session.className}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" aria-hidden />
                        最近更新 {formatter.format(new Date(session.updatedAt))}
                      </span>
                      <span>同步版本 {session.version}</span>
                    </div>
                    <Button
                      asChild
                      variant="secondary"
                      className="mt-4 w-full justify-center gap-2 text-sm"
                    >
                      <Link href={`/classroom?sessionId=${session.id}`}>
                        继续上课
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </article>
                ))
              ) : (
                <article className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
                  <p className="text-sm font-medium text-on-surface">
                    当前没有正在运行的课堂
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    你可以直接使用左侧主区域选择课时与班级，立即开启新的课堂流程。
                  </p>
                </article>
              )}
            </div>
          </Card>

          <Card className="bg-surface-container-low p-5 sm:p-6">
            <p className="text-sm text-on-surface-variant">开课提示</p>
            <div className="mt-4 grid gap-3">
              <InfoBlock
                title="先确认已发布课时"
                body="新课堂只会读取已发布版本，避免未定稿内容直接进入学生端。"
              />
              <InfoBlock
                title="名册会直接带入运行台"
                body="选定班级后，运行台会继续负责在线状态、锁定模式与步骤切换。"
              />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white/12 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-on-primary/75">
        <span className="rounded-full bg-white/15 p-2 text-white">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-[1.8rem] font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-on-primary/75">{detail}</p>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
      <p className="font-semibold text-on-surface">{title}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{body}</p>
    </div>
  );
}
