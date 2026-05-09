"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ghostSelectFieldClassName, ghostTextFieldClassName } from "@/components/ui/ghost-field";
import type { TeacherCourseDetailDTO } from "@/lib/dto/course-authoring";

type CourseUpdateResult =
  | { ok: true; data: TeacherCourseDetailDTO }
  | { ok: false; error: string; message: string };

type CourseDetailFormProps = {
  course: TeacherCourseDetailDTO;
  updateCourseAction: (input: Record<string, unknown>) => Promise<CourseUpdateResult>;
};

export function CourseDetailForm({ course, updateCourseAction }: CourseDetailFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    title: course.title,
    subject: course.subject,
    grade: course.grade,
    status: course.status,
  });

  const submit = () => {
    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await updateCourseAction({
        courseId: course.id,
        title: form.title,
        subject: form.subject,
        grade: form.grade,
        status: form.status,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setForm({
        title: result.data.title,
        subject: result.data.subject,
        grade: result.data.grade,
        status: result.data.status,
      });
      setSuccessMessage("课程信息已更新，并已同步到当前课程视图");
      router.refresh();
    });
  };

  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
      <p className="text-sm text-on-surface-variant">课程信息编辑</p>
      <h3 className="mt-2 text-2xl font-semibold text-on-surface">在详情页内直接更新课程基础信息</h3>

      {successMessage ? (
        <div className="mt-5 rounded-[1.5rem] bg-[rgba(78,167,114,0.14)] px-4 py-4 text-sm leading-7 text-on-surface">
          <p className="font-semibold text-[#1f6a3d]">课程信息已更新，并已同步到当前课程视图</p>
          <p className="mt-2 text-on-surface-variant">
            当前课程：{form.title} · {form.subject} · {form.grade} · {form.status === "published" ? "已发布" : form.status === "archived" ? "已归档" : "草稿"}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.5rem] bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <label htmlFor="course-detail-title" className="text-sm font-medium text-on-surface">
            课程名称
          </label>
          <input
            id="course-detail-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className={ghostTextFieldClassName}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="course-detail-subject" className="text-sm font-medium text-on-surface">
            学科
          </label>
          <input
            id="course-detail-subject"
            value={form.subject}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            className={ghostTextFieldClassName}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="course-detail-grade" className="text-sm font-medium text-on-surface">
            年级
          </label>
          <input
            id="course-detail-grade"
            value={form.grade}
            onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
            className={ghostTextFieldClassName}
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2 md:col-span-2">
          <label htmlFor="course-detail-status" className="text-sm font-medium text-on-surface">
            课程状态
          </label>
          <select
            id="course-detail-status"
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TeacherCourseDetailDTO["status"] }))}
            className={ghostSelectFieldClassName}
            disabled={isPending}
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          className="min-w-[9rem]"
          onClick={submit}
          disabled={isPending || !form.title.trim() || !form.subject.trim() || !form.grade.trim()}
        >
          {isPending ? "正在保存课程信息..." : "保存课程信息"}
        </Button>
        <Button variant="secondary" className="min-w-[9rem]" onClick={() => router.refresh()} disabled={isPending}>
          还原当前视图
        </Button>
      </div>
    </div>
  );
}
