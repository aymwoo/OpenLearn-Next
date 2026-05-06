import Link from "next/link";
import { ClipboardCheck, MessageCircle, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FeedbackComposer } from "@/components/learning/feedback-composer";
import type { QuizAttemptDTO, TaskAttemptDTO, TeacherLessonReviewDTO, TeacherReviewFilter, TeacherStudentReviewDTO } from "@/lib/dto/learning";

type TeacherReviewSurfaceProps = {
  review: TeacherLessonReviewDTO | null;
  selectedStudentId?: string | null;
  filter?: TeacherReviewFilter;
};

const filters: Array<{ value: TeacherReviewFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "not_started", label: "未开始" },
  { value: "in_progress", label: "进行中" },
  { value: "completed", label: "已完成" },
  { value: "needs_feedback", label: "待反馈" },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function attemptText(attempt: TaskAttemptDTO) {
  const payload = attempt.payload as { text?: string; answer?: string; body?: string } | string | null;

  if (typeof payload === "string") return payload;
  return payload?.text ?? payload?.answer ?? payload?.body ?? "已提交任务内容";
}

function quizOutcomeText(attempt: QuizAttemptDTO) {
  const outcome = attempt.outcome as { isCorrect?: boolean | null; selectedIndex?: number | null } | null;

  if (outcome?.isCorrect === true) return "答对了";
  if (outcome?.isCorrect === false) return "还可以再想想";
  return "已记录你的答案";
}

function StudentDetail({ student }: { student: TeacherStudentReviewDTO }) {
  const completed = student.progress.filter((item) => item.state === "completed" || item.state === "skipped").length;
  const total = student.progress.length;
  const latestTask = student.latestTaskSubmissions[0] ?? null;
  const latestQuiz = student.latestQuizAttempts[0] ?? null;
  const feedbackTargets = [
    ...student.latestTaskSubmissions.map((attempt) => ({ label: "任务反馈", targetType: "task_submission" as const, targetId: attempt.id, feedback: attempt.feedback })),
    ...student.latestQuizAttempts.map((attempt) => ({ label: "测验反馈", targetType: "quiz_attempt" as const, targetId: attempt.id, feedback: attempt.feedback })),
  ].sort((a, b) => Number(Boolean(a.feedback)) - Number(Boolean(b.feedback)));

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-on-surface-variant">学生详情</p>
          <Badge variant={student.needsFeedback ? "default" : "success"} className={student.needsFeedback ? "bg-[#fff3cd] text-[#856404]" : undefined}>
            {student.needsFeedback ? '待反馈' : '反馈已同步'}
          </Badge>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">{student.studentName}</h2>
      </div>

      <section className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">学习进度</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{completed}/{total} 已完成 · {student.needsFeedback ? "待反馈" : "反馈状态已同步"}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {student.progress.map((item) => (
            <div key={item.stepId} className="rounded-3xl bg-surface-container-lowest p-3 text-sm text-on-surface-variant">
              {item.state === "not_started" ? "未开始" : item.state === "in_progress" ? "进行中" : item.state === "completed" ? "已完成" : "已跳过"}
            </div>
          ))}
          {student.progress.length === 0 ? <p className="rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">暂无学生数据</p> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl bg-surface-container-low p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">最近任务</p>
            <Badge variant={latestTask?.feedback ? 'success' : 'default'} className={!latestTask?.feedback && latestTask ? 'bg-[#fff3cd] text-[#856404]' : undefined}>
              {latestTask ? (latestTask.feedback ? '已反馈' : '待反馈') : '暂无提交'}
            </Badge>
          </div>
          {latestTask ? (
            <div className="mt-3 text-sm leading-6 text-on-surface-variant">
              <p>第 {latestTask.attemptNo} 次尝试 · {formatTime(latestTask.createdAt)}</p>
              <p className="mt-2">{attemptText(latestTask)}</p>
              <p className="mt-2">反馈状态：{latestTask.feedback ? "已反馈" : "待反馈"}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">还没有提交学习证据</p>
          )}
        </article>

        <article className="rounded-3xl bg-surface-container-low p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">测验结果</p>
            <Badge variant={latestQuiz?.feedback ? 'success' : 'default'} className={!latestQuiz?.feedback && latestQuiz ? 'bg-[#fff3cd] text-[#856404]' : undefined}>
              {latestQuiz ? (latestQuiz.feedback ? '已反馈' : '待反馈') : '暂无测验'}
            </Badge>
          </div>
          {latestQuiz ? (
            <div className="mt-3 text-sm leading-6 text-on-surface-variant">
              <p>{quizOutcomeText(latestQuiz)} · 第 {latestQuiz.attemptNo} 次尝试</p>
              <p className="mt-2">反馈状态：{latestQuiz.feedback ? "已反馈" : "待反馈"}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">还没有提交学习证据</p>
          )}
        </article>
      </section>

      <section className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">历史尝试</p>
        <div className="mt-3 grid gap-3">
          {[...student.taskSubmissionHistory, ...student.quizAttemptHistory]
            .sort((a, b) => a.attemptNo - b.attemptNo)
            .map((attempt) => (
              <article key={attempt.id} className="rounded-3xl bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface-variant">
                第 {attempt.attemptNo} 次尝试 · {attempt.isLatest ? "最新" : "历史记录"}
              </article>
            ))}
          {student.taskSubmissionHistory.length + student.quizAttemptHistory.length === 0 ? (
            <p className="rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">第 1 次尝试会在学生提交后出现在这里。</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl bg-surface-container-low p-5">
        <p className="font-semibold">反馈状态</p>
        {feedbackTargets.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {feedbackTargets.map((target) => (
              <div key={`${target.targetType}-${target.targetId}`}>
                <p className="mb-2 text-sm font-semibold text-on-surface-variant">{target.label}</p>
                <FeedbackComposer targetType={target.targetType} targetId={target.targetId} latestFeedback={target.feedback} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">还没有提交学习证据</p>
        )}
      </section>
    </div>
  );
}

export function TeacherReviewSurface({ review, selectedStudentId, filter = "all" }: TeacherReviewSurfaceProps) {
  const activeFilter = review?.filter ?? filter;
  const selectedStudent = review?.students.find((student) => student.studentId === selectedStudentId) ?? review?.students[0] ?? null;
  const filterBadgeClass = "bg-surface-container-lowest text-on-surface-variant shadow-none hover:bg-surface-container-high";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-low shadow-ambient">
        <div className="bg-linear-135 from-primary to-primary-container px-6 py-7 text-on-primary sm:px-8">
          <Badge variant="accent" className="mb-4 bg-white/15 text-white">教师复盘</Badge>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
                {review?.title ?? "学习证据复盘"}
              </h1>
              <p className="mt-4 max-w-3xl leading-8 text-on-primary/85">
                查看学生进度、最新提交、测验结果和基础反馈状态，保持轻量复盘，不进入完整成绩册流程。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
              <HeroMetric label="待反馈" value={String(review?.overview.needsFeedbackCount ?? 0)} />
              <HeroMetric label="已完成" value={String(review?.overview.completedCount ?? 0)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="bg-surface-container-lowest">
          <UsersRound className="mb-4 size-6 text-on-surface-variant" aria-hidden />
          <p className="text-sm text-on-surface-variant">未开始</p>
          <p className="mt-2 text-2xl font-semibold">{review?.overview.notStartedCount ?? 0}</p>
        </Card>
        <Card className="bg-surface-container-lowest">
          <ClipboardCheck className="mb-4 size-6 text-primary" aria-hidden />
          <p className="text-sm text-on-surface-variant">进行中</p>
          <p className="mt-2 text-2xl font-semibold">{review?.overview.inProgressCount ?? 0}</p>
        </Card>
        <Card className="bg-surface-container-lowest">
          <ClipboardCheck className="mb-4 size-6 text-tertiary" aria-hidden />
          <p className="text-sm text-on-surface-variant">已完成</p>
          <p className="mt-2 text-2xl font-semibold">{review?.overview.completedCount ?? 0}</p>
        </Card>
        <Card className="bg-surface-container-lowest">
          <MessageCircle className="mb-4 size-6 text-[#856404]" aria-hidden />
          <p className="text-sm text-on-surface-variant">待反馈</p>
          <p className="mt-2 text-2xl font-semibold">{review?.overview.needsFeedbackCount ?? 0}</p>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3 rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
        {filters.map((item) => {
          const active = item.value === activeFilter;
          const href = review ? `/teacher/review?lessonId=${encodeURIComponent(review.lessonId)}&filter=${item.value}` : `/teacher/review?filter=${item.value}`;

          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${active ? 'bg-primary text-on-primary shadow-ambient' : filterBadgeClass}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[var(--radius-shell)] bg-surface-container-low p-4 shadow-ambient">
          {review && review.students.length > 0 ? (
            <div className="grid gap-3">
              {review.students.map((student) => {
                const selected = student.studentId === selectedStudentId || (!selectedStudentId && student.studentId === review.students[0]?.studentId);
                return (
                  <Link
                    key={student.studentId}
                    href={`/teacher/review?lessonId=${encodeURIComponent(review.lessonId)}&filter=${activeFilter}&studentId=${encodeURIComponent(student.studentId)}`}
                    className={`rounded-3xl p-4 transition focus-visible:outline-2 focus-visible:outline-primary ${selected ? "bg-surface-container-lowest shadow-ambient" : "bg-surface-container-lowest/70"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{student.studentName}</p>
                      <Badge variant={student.needsFeedback ? 'default' : 'success'} className={student.needsFeedback ? 'bg-[#fff3cd] text-[#856404]' : undefined}>
                        {student.needsFeedback ? '待反馈' : '已同步'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">{student.needsFeedback ? "优先查看最近任务与测验反馈。" : "反馈状态已同步"}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-3xl bg-surface-container-lowest p-5 text-sm leading-6 text-on-surface-variant">
              {review ? "暂无学生数据" : "还没有提交学习证据"}
            </p>
          )}
        </aside>

        <Card className="min-h-[420px] bg-surface-container-lowest">
          {selectedStudent ? (
            <StudentDetail student={selectedStudent} />
          ) : (
            <div>
              <p className="text-sm text-on-surface-variant">学生详情</p>
              <h2 className="mt-3 text-2xl font-semibold">请选择学生查看学习证据</h2>
              <p className="mt-4 leading-8 text-on-surface-variant">
                详情区域会优先呈现学习进度，再查看最近任务、测验结果、历史尝试和反馈状态。
              </p>
              <p className="mt-6 rounded-3xl bg-surface-container-low p-5 text-sm leading-6 text-on-surface-variant">还没有提交学习证据</p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/12 px-4 py-4 backdrop-blur-sm">
      <p className="text-sm text-on-primary/75">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}
