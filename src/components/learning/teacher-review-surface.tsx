import Link from "next/link";
import { ClipboardCheck, MessageCircle, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TeacherLessonReviewDTO, TeacherReviewFilter } from "@/lib/dto/learning";

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

export function TeacherReviewSurface({ review, selectedStudentId, filter = "all" }: TeacherReviewSurfaceProps) {
  const activeFilter = review?.filter ?? filter;

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-6 shadow-ambient sm:p-8">
        <Badge variant="accent" className="mb-4 bg-surface-container-lowest">教师复盘</Badge>
        <h1 className="text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[3rem]">
          {review?.title ?? "学习证据复盘"}
        </h1>
        <p className="mt-4 max-w-3xl leading-8 text-on-surface-variant">
          查看学生进度、最新提交、测验结果和基础反馈状态，保持轻量复盘，不进入完整成绩册流程。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="bg-surface-container-lowest">
          <UsersRound className="mb-4 size-6 text-primary" aria-hidden />
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
          <MessageCircle className="mb-4 size-6 text-primary" aria-hidden />
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
              className={`rounded-full px-4 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${active ? "bg-primary text-on-primary shadow-ambient" : "bg-surface-container-lowest text-on-surface-variant"}`}
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
                    <p className="font-semibold">{student.studentName}</p>
                    <p className="mt-2 text-sm text-on-surface-variant">{student.needsFeedback ? "待反馈" : "反馈状态已同步"}</p>
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
          <p className="text-sm text-on-surface-variant">学生详情</p>
          <h2 className="mt-3 text-2xl font-semibold">请选择学生查看学习证据</h2>
          <p className="mt-4 leading-8 text-on-surface-variant">
            详情区域会优先呈现进度，再查看最近任务、测验结果、历史尝试和反馈状态。
          </p>
          <p className="mt-6 rounded-3xl bg-surface-container-low p-5 text-sm leading-6 text-on-surface-variant">还没有提交学习证据</p>
        </Card>
      </section>
    </div>
  );
}
