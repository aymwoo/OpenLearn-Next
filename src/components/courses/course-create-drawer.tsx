"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ghostSelectFieldClassName, ghostTextFieldClassName } from "@/components/ui/ghost-field";
import type { TeacherCourseScopeSchoolDTO } from "@/lib/dto/course-authoring";

type CourseCreateResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string; message: string };

type CourseCreateDrawerProps = {
  createCourseAction: (input: Record<string, unknown>) => Promise<CourseCreateResult>;
  defaultSchoolId: string | null;
  availableSchools: TeacherCourseScopeSchoolDTO[];
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "tertiary";
};

const initialForm = {
  title: "",
  subject: "",
  grade: "",
};

export function CourseCreateDrawer({
  createCourseAction,
  defaultSchoolId,
  availableSchools,
  triggerLabel = "新建课程",
  triggerVariant = "primary",
}: CourseCreateDrawerProps) {
  const router = useRouter();
  const initialSchoolId = useMemo(
    () => defaultSchoolId ?? availableSchools[0]?.id ?? "",
    [availableSchools, defaultSchoolId],
  );
  const selectedSchool = availableSchools.find((school) => school.id === initialSchoolId) ?? availableSchools[0] ?? null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!selectedSchoolId) {
      setError("当前教师身份没有可用学校，暂时无法创建课程。");
      return;
    }

    setError("");

    startTransition(async () => {
      const result = await createCourseAction({
        schoolId: selectedSchoolId,
        title: form.title,
        subject: form.subject,
        grade: form.grade,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setForm(initialForm);
      setSelectedSchoolId(initialSchoolId);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant={triggerVariant}
        className="gap-2 px-5 text-sm"
        onClick={() => {
          setSelectedSchoolId(initialSchoolId);
          setOpen(true);
        }}
      >
        <BookMarked className="size-5" aria-hidden />
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(26,30,37,0.18)] backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[28rem] flex-col bg-surface-container-low p-6 shadow-[0_24px_80px_rgba(25,30,40,0.18)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-on-surface-variant">右侧抽屉新建课程</p>
                <h2 className="mt-2 text-2xl font-semibold text-on-surface">快速创建课程</h2>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  填写课程名称、学科与年级后，即可把新课程立即加入当前课程总览。
                </p>
              </div>
              <Button variant="tertiary" className="min-h-10 px-2" onClick={() => setOpen(false)}>
                <X className="size-5" aria-hidden />
              </Button>
            </div>

            {error ? (
              <div className="mt-5 rounded-[1.5rem] bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                {error}
              </div>
            ) : null}

            <div className="mt-6 space-y-4 rounded-[1.75rem] bg-surface-container-lowest p-5 shadow-ambient">
              {availableSchools.length > 1 ? (
                <div className="grid gap-2">
                  <label htmlFor="course-create-school" className="text-sm font-medium text-on-surface">
                    授课学校
                  </label>
                  <select
                    id="course-create-school"
                    value={selectedSchoolId}
                    onChange={(event) => setSelectedSchoolId(event.target.value)}
                    className={ghostSelectFieldClassName}
                    disabled={isPending}
                  >
                    {availableSchools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedSchool ? (
                <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-3 text-sm leading-7 text-on-surface-variant">
                  当前将为 <span className="font-semibold text-on-surface">{selectedSchool.name}</span> 创建课程。
                </div>
              ) : (
                <div className="rounded-[1.5rem] bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
                  当前教师身份没有可用学校，暂时无法创建课程。
                </div>
              )}

              <div className="grid gap-2">
                <label htmlFor="course-create-title" className="text-sm font-medium text-on-surface">
                  课程名称
                </label>
                <input
                  id="course-create-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className={ghostTextFieldClassName}
                  placeholder="例如：七年级科学探究"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="course-create-subject" className="text-sm font-medium text-on-surface">
                  学科
                </label>
                <input
                  id="course-create-subject"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  className={ghostTextFieldClassName}
                  placeholder="例如：科学"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="course-create-grade" className="text-sm font-medium text-on-surface">
                  年级
                </label>
                <input
                  id="course-create-grade"
                  value={form.grade}
                  onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
                  className={ghostTextFieldClassName}
                  placeholder="例如：七年级"
                  disabled={isPending}
                />
              </div>

              <div className="rounded-[1.5rem] bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
                新建课程默认以草稿状态创建，创建后会立即回到课程卡片网格，并保留进入详情页的入口。
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <Button variant="secondary" className="flex-1 min-w-[9rem]" onClick={() => setOpen(false)} disabled={isPending}>
                取消
              </Button>
              <Button
                className="flex-1 min-w-[9rem]"
                onClick={submit}
                disabled={isPending || !selectedSchoolId || !form.title.trim() || !form.subject.trim() || !form.grade.trim()}
              >
                {isPending ? "正在创建课程..." : "创建课程"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
