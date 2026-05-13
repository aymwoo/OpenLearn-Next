"use client";

import Link from "next/link";
import {
  ArrowRight,
  MonitorUp,
  PlayCircle,
  RadioTower,
  UsersRound,
} from "lucide-react";

import { ClassroomControlPanel } from "@/components/classroom/classroom-control-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { ClassroomSnapshotDTO, ClassroomStudentDetailDTO, ClassroomStudentDetailTab } from "@/lib/dto/classroom";
import { cn } from "@/lib/utils";

type ClassroomConsoleDTO = {
  publishedLessons: Array<{
    id: string;
    title: string;
    publishedVersionId: string;
    courseId: string;
    classes: Array<{ id: string; name: string }>;
  }>;
  liveSessions: Array<{
    id: string;
    lessonId: string;
    lessonTitle: string;
    classId: string;
    className: string;
    updatedAt: string;
    locked: boolean;
    version: number;
    status: "live";
  }>;
  emptyStateCopy: string;
};

export function ClassroomConsoleSurface({
  consoleData,
  initialSnapshot,
  studentDetail,
  activeDetailTab,
}: {
  consoleData: ClassroomConsoleDTO;
  initialSnapshot: ClassroomSnapshotDTO | null;
  studentDetail?: ClassroomStudentDetailDTO | null;
  activeDetailTab?: ClassroomStudentDetailTab;
}) {
  const classCount = new Set(
    consoleData.publishedLessons.flatMap((lesson) =>
      lesson.classes.map((item) => item.id),
    ),
  ).size;

  if (initialSnapshot) {
    return (
      <div className={cn(teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
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
              <div>
                <Badge variant="accent" className="bg-white/15 text-white">
                  课堂教学运行管理
                </Badge>
                <h1 className="mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">
                  {initialSnapshot.lessonTitle}
                </h1>
                <p className="mt-3 text-sm leading-7 text-on-primary/85 sm:text-base sm:leading-8">
                  当前面向 {initialSnapshot.className}{" "}
                  进行课堂流程运行。保留现有同步逻辑，仅优化教师控课台的分区、节奏感与信息优先级。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:w-[28rem]">
                <HeroMetric
                  icon={<PlayCircle className="size-4" aria-hidden />}
                  label="当前环节"
                  value={String(
                    initialSnapshot.steps.findIndex(
                      (step) => step.id === initialSnapshot.activeStepId,
                    ) + 1,
                  )}
                  detail={`${initialSnapshot.steps.length} 个环节`}
                />
                <HeroMetric
                  icon={<UsersRound className="size-4" aria-hidden />}
                  label="在线学生"
                  value={String(
                    initialSnapshot.participants.filter(
                      (item) => item.connectionState === "connected",
                    ).length,
                  )}
                  detail={`共 ${initialSnapshot.participants.length} 人`}
                />
                <HeroMetric
                  icon={<RadioTower className="size-4" aria-hidden />}
                  label="同步模式"
                  value={initialSnapshot.locked ? "锁定" : "自由"}
                  detail={`第 ${initialSnapshot.version} 次同步`}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className={cn(teacherSurfaceRhythm.sectionCompact, "sm:hidden")}
        >
          <div className="flex items-center gap-3">
            <MonitorUp className="size-6 text-primary" aria-hidden />
            <p className="font-semibold">建议使用桌面端控课，当前为可读预览</p>
          </div>
        </section>

        <section className={cn(teacherSurfaceRhythm.sectionCompact, 'bg-surface-container-low')}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">教师运行台</p>
              <h2 className="mt-1 text-2xl font-semibold text-on-surface">课堂控制与干预记录</h2>
            </div>
            <Badge className="bg-surface-container-lowest text-on-surface-variant">单一主舞台 + 次级 tonal panels</Badge>
          </div>
          <p className="text-sm leading-7 text-on-surface-variant">
            当前课堂保留渐变主舞台承载关键状态，其余控制、名册与干预记录全部回落到稳定的 tonal cards，避免信息挤进同一控制区。
          </p>
        </section>

        <ClassroomControlPanel initialSnapshot={initialSnapshot} studentDetail={studentDetail ?? null} activeDetailTab={activeDetailTab ?? 'evidence'} />
      </div>
    );
  }

  return (
    <div className={cn(teacherSurfaceRhythm.stack, "p-4 sm:p-5 lg:p-6")}>
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
            <div>
              <Badge variant="accent" className="bg-white/15 text-white">
                课堂教学流程运行管理
              </Badge>
              <h1 className="mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">
                进入课堂运行台
              </h1>
              <p className="mt-3 text-sm leading-7 text-on-primary/85 sm:text-base sm:leading-8">
                这里继续负责 live classroom
                的锁定模式、步骤推进与冲突恢复。若你要新开课堂，请先回到专用的开启新课堂页面完成准备。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[28rem]">
              <HeroMetric
                icon={<PlayCircle className="size-4" aria-hidden />}
                label="已发布课时"
                value={String(consoleData.publishedLessons.length)}
                detail="可直接启动"
              />
              <HeroMetric
                icon={<UsersRound className="size-4" aria-hidden />}
                label="可用班级"
                value={String(classCount)}
                detail="已绑定名单"
              />
              <HeroMetric
                icon={<RadioTower className="size-4" aria-hidden />}
                label="运行状态"
                value="待启动"
                detail="进入后自动同步"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="bg-surface-container-lowest p-6 sm:p-7">
          <div
            className={cn(
              teacherSurfaceRhythm.card,
              "bg-surface-container-low p-5",
            )}
          >
            <Badge variant="accent" className="mb-4">
              运行台入口
            </Badge>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">先去准备，再回运行台</h2>
                <p className="mt-3 text-on-surface-variant">
                  当前没有 live classroom。/classroom
                  不再承担主要开课准备流程，而是保留给已经开始的课堂运行与恢复操作。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem]">
                <MetricTile
                  icon={<PlayCircle className="size-4 text-primary" />}
                  label="已发布课时"
                  value={String(consoleData.publishedLessons.length)}
                />
                <MetricTile
                  icon={<UsersRound className="size-4 text-primary" />}
                  label="进行中课堂"
                  value={String(consoleData.liveSessions.length)}
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              teacherSurfaceRhythm.card,
              "mt-5 bg-surface-container-low p-5",
            )}
          >
            <p className="text-sm text-on-surface-variant">建议流程</p>
            <div className="mt-3 grid gap-3">
              <InfoBlock
                title="1. 前往专用开课页"
                body="在开启新课堂页面选择已发布课时与班级，完成本次课堂准备。"
              />
              <InfoBlock
                title="2. 创建后自动回到运行台"
                body="创建成功会直接切换到这里，继续处理锁定模式、切换环节和状态恢复。"
              />
            </div>
            <Button
              asChild
              className="mt-5 w-full justify-center gap-2 text-base"
            >
              <Link href="/teacher/launch">
                前往开启新课堂
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="bg-surface-container-low p-5 sm:p-6">
          <p className="text-sm text-on-surface-variant">开课提示</p>
          <div className="mt-4 grid gap-3">
            <InfoBlock
              title="运行台负责什么"
              body="一旦课堂已启动，这里继续保留当前环节、在线学生、锁定模式与冲突恢复能力。"
            />
            <InfoBlock
              title="何时回到开课页"
              body="当你准备发起新的课堂流程时，请使用专用的开启新课堂页面，而不是在运行台重复准备流程。"
            />
          </div>
        </Card>
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

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={cn(teacherSurfaceRhythm.cardInset, "p-4")}>
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-[1.6rem] font-semibold text-on-surface">
        {value}
      </p>
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
