"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ClipboardList, MessageSquareMore, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type { ClassroomSessionRecapDTO } from "@/lib/dto/classroom";
import { cn } from "@/lib/utils";

export function ClassroomSessionRecapSurface({ recap }: { recap: ClassroomSessionRecapDTO }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectStudent = (studentId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sessionId", recap.session.id);
    params.set("studentId", studentId);
    params.set("recapTab", "students");
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedStudentId = recap.selectedStudent?.studentId ?? null;
  const trendsHref = `/teacher/trends?classId=${encodeURIComponent(recap.session.classId)}&lessonId=${encodeURIComponent(recap.session.lessonId)}&sessionId=${encodeURIComponent(recap.session.id)}&view=sessions`;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-surface-container-low">
        <div className={cn("bg-linear-135 from-primary to-primary-container text-on-primary", teacherSurfaceRhythm.gradientHeroContent)}>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge variant="accent" className="bg-white/15 text-white">课堂复盘</Badge>
              <h2 className="mt-4 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">{recap.session.lessonTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-on-primary/85 sm:text-base sm:leading-8">
                {recap.session.className} 已结束，本页继续留在 `/classroom` 内查看这节课的完成、参与和后续工作。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[28rem]">
              <HeroMetric label="完成情况" value={recap.summary.completionLabel} detail={`共 ${recap.summary.totalStudents} 人`} icon={<CheckCircle2 className="size-4" aria-hidden />} />
              <HeroMetric label="课堂提交" value={String(recap.summary.submissionCount)} detail="来自最新 task / quiz 提交" icon={<ClipboardList className="size-4" aria-hidden />} />
              <HeroMetric label="结束时间" value={new Date(recap.session.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} detail="已切换为课后复盘" icon={<UsersRound className="size-4" aria-hidden />} />
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="积极参与" value={String(recap.summary.participationBuckets.active)} tone="neutral" />
        <MetricCard label="正常参与" value={String(recap.summary.participationBuckets.normal)} tone="neutral" />
        <MetricCard label="需要关注" value={String(recap.summary.participationBuckets.attention)} tone="attention" />
        <MetricCard label="未评价" value={String(recap.summary.participationBuckets.unevaluated)} tone="muted" />
      </section>

      <section className={cn(teacherSurfaceRhythm.sectionCompact, "bg-surface-container-low") }>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">教师后续工作</p>
            <h3 className="mt-2 text-2xl font-semibold text-on-surface">把课堂信号和批改反馈分开处理</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => recap.studentSummaries[0] && selectStudent(recap.studentSummaries[0].studentId)}>
              查看学生复盘
            </Button>
            <Button asChild type="button" variant="secondary" className="min-h-[44px]">
              <Link href={trendsHref}>查看班级趋势</Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <WorkloadCard
            title="待跟进课堂信号"
            value={recap.workload.followUpSignalsCount}
            tone="attention"
            description="统计需要关注档、关键提交缺失，以及已有课堂证据但还未留下过程评价的学生。"
            suggestions={[
              "先优先查看需要跟进的学生摘要",
              "结合课堂时间线确认是否需要课后补充指导",
            ]}
          />
          <WorkloadCard
            title="待反馈提交"
            value={recap.workload.pendingFeedbackCount}
            tone="neutral"
            description="按最新 task / quiz 提交统计，方便回到批改中心处理本节课留下的反馈债。"
            suggestions={[
              "优先处理最新提交未反馈的学生",
              "必要时再进入批改中心补充逐条反馈",
            ]}
          />
        </div>
      </section>

      <Card className="bg-surface-container-low p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">题目复盘</p>
            <h3 className="mt-2 text-2xl font-semibold text-on-surface">看清这道题答得怎样，再决定该回看谁</h3>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              正确率按已作答人数计算；作答 / 未作答人数相对本次课堂参与者名单。
            </p>
          </div>
          <Badge className="bg-surface-container-lowest text-on-surface-variant">
            {recap.quizSampleStats.questionCount} 道题
          </Badge>
        </div>

        {recap.quizSampleStats.questionCount === 0 ? (
          <div className="mt-5 rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
            当前课堂没有 quiz sample 题目，或还没有可用于复盘的作答记录。
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {recap.quizSampleStats.questions.map((question) => (
              <article key={question.stepId} className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-sm text-on-surface-variant">{question.stepTitle}</p>
                    <h4 className="mt-2 text-xl font-semibold text-on-surface">{question.prompt}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-primary/10 text-primary">正确答案 {question.correctOption}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">已作答 {question.answeredCount}</Badge>
                    <Badge className="bg-surface-container-low text-on-surface-variant">未作答 {question.unansweredCount}</Badge>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <MetricCard label="正确率" value={`${Math.round(question.correctRate * 100)}%`} tone={question.correctRate < 0.5 ? "attention" : "neutral"} />
                  <MetricCard label="答对人数" value={String(question.correctCount)} tone="neutral" />
                  <MetricCard label="已作答" value={String(question.answeredCount)} tone="neutral" />
                  <MetricCard label="未作答" value={String(question.unansweredCount)} tone="muted" />
                </div>

                <div className="mt-5 space-y-3">
                  {question.options.map((option) => (
                    <div key={`${question.stepId}-${option.slot}`} className={cn(
                      "rounded-[1.2rem] p-4 shadow-ambient",
                      option.isCorrect ? "bg-primary/10" : "bg-surface-container-low",
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn(
                            "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                            option.isCorrect ? "bg-primary text-white" : "bg-surface-container-lowest text-on-surface",
                          )}>
                            {option.slot}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-on-surface">{option.label}</p>
                            <p className="text-xs text-on-surface-variant">{option.count} 人选择</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-on-surface">{Math.round(option.percentage * 100)}%</p>
                          {option.isCorrect ? <p className="text-xs text-primary">正确答案</p> : null}
                        </div>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-white/70">
                        <div
                          className={cn("h-full rounded-full", option.isCorrect ? "bg-linear-135 from-primary to-primary-container" : "bg-surface-container-high")}
                          style={{ width: `${Math.max(option.percentage * 100, option.count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-sm leading-7 text-on-surface-variant">{question.denominatorLabel}</p>
              </article>
            ))}
          </div>
        )}
      </Card>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="bg-surface-container-low p-5 sm:p-6">
          <p className="text-sm text-on-surface-variant">学生复盘</p>
          <h3 className="mt-2 text-2xl font-semibold text-on-surface">谁需要先看，谁需要先跟进</h3>
          <div className="mt-5 space-y-3">
            {recap.studentSummaries.length === 0 ? (
              <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
                还没有可回看的课堂记录
              </div>
            ) : recap.studentSummaries.map((student) => {
              const selected = student.studentId === selectedStudentId;
              return (
                <button
                  key={student.studentId}
                  type="button"
                  onClick={() => selectStudent(student.studentId)}
                  className={cn(
                    "flex min-h-[44px] w-full flex-col gap-2 rounded-[1.35rem] p-4 text-left transition-colors",
                    selected ? "bg-primary/10" : "bg-surface-container-lowest hover:bg-surface-container-high",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-on-surface">{student.studentName}</span>
                    <Badge className={student.needsFollowUp ? "bg-[#fff1dc] text-[#996515]" : "bg-surface-container-low text-on-surface-variant"}>
                      {student.needsFollowUp ? "待跟进" : "已梳理"}
                    </Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant">{student.completionLabel}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                    <span>{student.participationLabel}</span>
                    <span>课堂证据 {student.evidenceCount} 条</span>
                    <span>待反馈 {student.pendingFeedbackCount} 项</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="bg-surface-container-low p-5 sm:p-6">
          {recap.selectedStudent ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-on-surface-variant">单学生复盘</p>
                <h3 className="mt-2 text-2xl font-semibold text-on-surface">{recap.selectedStudent.studentName}</h3>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MetricCard label="完成情况" value={recap.selectedStudent.completionLabel} tone="neutral" />
                <MetricCard label="参与状态" value={recap.selectedStudent.participationLabel} tone={recap.selectedStudent.participationLabel === "需要关注" ? "attention" : recap.selectedStudent.participationLabel === "未评价" ? "muted" : "neutral"} />
                <MetricCard label="提交与回应" value={`${recap.selectedStudent.evidenceCount} 条`} tone="neutral" />
                <MetricCard label="当前跟进" value={recap.selectedStudent.needsFollowUp ? "需要跟进" : "已清空"} tone={recap.selectedStudent.needsFollowUp ? "attention" : "neutral"} />
              </div>

              <EvidenceGroup title="完成情况" items={recap.selectedStudent.completionItems} emptyCopy="本次课堂暂时没有可用的完成记录。" />
              <EvidenceGroup title="提交与反馈" items={recap.selectedStudent.submissionItems} emptyCopy="本次课堂还没有该学生的课堂证据，可先查看过程评价或课堂时间线。" />
              <EvidenceGroup title="过程评价" items={recap.selectedStudent.evaluationItems} emptyCopy="本次课堂还没有留下过程评价。" />
              <EvidenceGroup title="课堂时间线" items={recap.selectedStudent.timelineItems} emptyCopy="本次课堂还没有该学生的课堂时间线。" />
            </div>
          ) : (
            <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
              请选择一名学生查看本节课的复盘摘要。
            </div>
          )}
        </Card>
      </section>

      <Card className="bg-surface-container-low p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">环节诊断</p>
            <h3 className="mt-2 text-2xl font-semibold text-on-surface">用于判断哪一环节需要回看，不替代学生复盘主路径</h3>
          </div>
          <AlertCircle className="mt-1 size-5 text-primary" aria-hidden />
        </div>

        {recap.stepSummaries.length === 0 ? (
          <div className="mt-5 rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
            本次课堂暂时没有可用的环节诊断。
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {recap.stepSummaries.map((step) => (
              <div key={step.stepId} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
                <p className="font-semibold text-on-surface">{step.stepTitle}</p>
                <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3">
                  <span>完成 {step.completionCount}/{step.totalStudents}</span>
                  <span>提交 {step.submissionCount}</span>
                  <span>需关注 {step.attentionCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function HeroMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
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

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "neutral" | "attention" | "muted" }) {
  const className = tone === "attention"
    ? "bg-[#fff6e7]"
    : tone === "muted"
      ? "bg-surface-container-lowest"
      : "bg-surface-container-lowest";
  return (
    <div className={cn("rounded-[1.3rem] p-4 shadow-ambient", className)}>
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-lg font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function WorkloadCard({ title, value, description, suggestions, tone }: { title: string; value: number; description: string; suggestions: string[]; tone: "neutral" | "attention" }) {
  return (
    <div className={cn("rounded-[1.5rem] p-5 shadow-ambient", tone === "attention" ? "bg-[#fff6e7]" : "bg-surface-container-lowest")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-on-surface">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-on-surface">{value}</p>
        </div>
        {tone === "attention" ? <AlertCircle className="size-5 text-[#996515]" aria-hidden /> : <MessageSquareMore className="size-5 text-primary" aria-hidden />}
      </div>
      <p className="mt-3 text-sm leading-7 text-on-surface-variant">{description}</p>
      <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
        {suggestions.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function EvidenceGroup({ title, items, emptyCopy }: { title: string; items: Array<{ id: string; title: string; detail: string; createdAt?: string }>; emptyCopy: string }) {
  return (
    <section className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
      <h4 className="text-lg font-semibold text-on-surface">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">{emptyCopy}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-[1.15rem] bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-on-surface">{item.title}</p>
                {item.createdAt ? <span className="text-xs text-on-surface-variant">{new Date(item.createdAt).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-on-surface-variant">{item.detail}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
