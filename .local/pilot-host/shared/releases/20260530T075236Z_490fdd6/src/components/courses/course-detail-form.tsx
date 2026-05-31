"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ghostSelectFieldClassName, ghostTextFieldClassName } from "@/components/ui/ghost-field";
import type { CourseDeleteBlockedReasonDTO, TeacherCourseDetailDTO } from "@/lib/dto/course-authoring";

type CourseMutationResult =
  | { ok: true; data: TeacherCourseDetailDTO }
  | { ok: false; error: string; message: string };

type CourseDeleteResult =
  | { ok: true; data: { id: string; title: string } }
  | { ok: false; error: string; message: string }
  | { ok: false; error: "DELETE_BLOCKED"; message: string; reasons: CourseDeleteBlockedReasonDTO[] };

type CourseDetailFormProps = {
  course: TeacherCourseDetailDTO;
  updateCourseAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  addCourseClassAssociationAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  removeCourseClassAssociationAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  addCourseEnrollmentAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  removeCourseEnrollmentAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  publishCourseAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  unpublishCourseAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  archiveCourseAction: (input: Record<string, unknown>) => Promise<CourseMutationResult>;
  deleteCourseAction: (input: Record<string, unknown>) => Promise<CourseDeleteResult>;
};

const courseStatusLabels = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
} as const;

function getCourseStatusLabel(status: string) {
  return courseStatusLabels[status as keyof typeof courseStatusLabels] ?? status;
}

function getCourseStatusHint(status: string) {
  switch (status) {
    case "published":
      return "课程已发布。如需继续调整结构或课时内容，可先恢复为草稿。";
    case "archived":
      return "已归档课程会默认从教师课程总览和课时入口中隐藏。";
    default:
      return "课程仍处于草稿阶段，发布后会在教师流程里显示为已发布。";
  }
}

export function CourseDetailForm({
  course,
  updateCourseAction,
  addCourseClassAssociationAction,
  removeCourseClassAssociationAction,
  addCourseEnrollmentAction,
  removeCourseEnrollmentAction,
  publishCourseAction,
  unpublishCourseAction,
  archiveCourseAction,
  deleteCourseAction,
}: CourseDetailFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(course.availableClasses[0]?.id ?? "");
  const [savedCourse, setSavedCourse] = useState({
    title: course.title,
    subject: course.subject,
    grade: course.grade,
    status: course.status,
    classLinks: course.classLinks,
    availableClasses: course.availableClasses,
    members: course.members,
    eligibleStudents: course.eligibleStudents,
    enrollmentCount: course.enrollmentCount,
    deleteEligibility: course.deleteEligibility,
  });
  const [form, setForm] = useState({
    title: course.title,
    subject: course.subject,
    grade: course.grade,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const currentStatus = savedCourse.status;
  const classLinks = savedCourse.classLinks;
  const availableClasses = savedCourse.availableClasses;
  const members = savedCourse.members;
  const eligibleStudents = savedCourse.eligibleStudents;
  const enrollmentCount = savedCourse.enrollmentCount;
  const deleteEligibility = savedCourse.deleteEligibility;
  const membershipReadOnly = currentStatus === "archived";
  const deleteConfirmationMatches = deleteConfirmation.trim() === savedCourse.title;
  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const filteredEligibleStudents = eligibleStudents.filter((student) => {
    if (!normalizedMemberSearch) {
      return true;
    }

    return (
      student.studentName.toLowerCase().includes(normalizedMemberSearch) ||
      student.studentNumber.toLowerCase().includes(normalizedMemberSearch)
    );
  });

  const resetForm = () => {
    setForm({
      title: savedCourse.title,
      subject: savedCourse.subject,
      grade: savedCourse.grade,
    });
    setSelectedClassId(savedCourse.availableClasses[0]?.id ?? "");
    setDeleteConfirmation("");
    setMemberSearch("");
    setError("");
    setSuccessMessage("");
    router.refresh();
  };

  const syncLocalCourseState = (nextCourse: TeacherCourseDetailDTO) => {
    setSavedCourse({
      title: nextCourse.title,
      subject: nextCourse.subject,
      grade: nextCourse.grade,
      status: nextCourse.status,
      classLinks: nextCourse.classLinks,
      availableClasses: nextCourse.availableClasses,
      members: nextCourse.members,
      eligibleStudents: nextCourse.eligibleStudents,
      enrollmentCount: nextCourse.enrollmentCount,
      deleteEligibility: nextCourse.deleteEligibility,
    });
    setForm({
      title: nextCourse.title,
      subject: nextCourse.subject,
      grade: nextCourse.grade,
    });
    setSelectedClassId(nextCourse.availableClasses[0]?.id ?? "");
    setDeleteConfirmation("");
    setMemberSearch("");
  };

  const runCourseMutation = (
    action: () => Promise<CourseMutationResult>,
    getMessage: (nextCourse: TeacherCourseDetailDTO) => string,
  ) => {
    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        setError(result.message);
        return;
      }

      syncLocalCourseState(result.data);
      setSuccessMessage(getMessage(result.data));
      router.refresh();
    });
  };

  const submit = () => {
    runCourseMutation(
      () =>
        updateCourseAction({
          courseId: course.id,
          title: form.title,
          subject: form.subject,
          grade: form.grade,
          status: currentStatus,
        }),
      () => "课程信息已更新，并已同步到当前课程视图",
    );
  };

  const publishCourse = () => {
    runCourseMutation(
      () => publishCourseAction({ courseId: course.id }),
      () => "课程已发布，并已同步到当前课程视图",
    );
  };

  const restoreDraft = () => {
    const previousStatus = currentStatus;

    runCourseMutation(
      () => unpublishCourseAction({ courseId: course.id }),
      () =>
        previousStatus === "archived"
          ? "课程已恢复为草稿，可继续进入课时管理。"
          : "课程已恢复为草稿，可继续调整后再发布。",
    );
  };

  const archiveCourse = () => {
    runCourseMutation(
      () => archiveCourseAction({ courseId: course.id }),
      () => "课程已归档，默认教师流程将不再显示该课程。",
    );
  };

  const addClassAssociation = () => {
    if (!selectedClassId) {
      return;
    }

    const selectedClassName =
      availableClasses.find((classOption) => classOption.id === selectedClassId)?.name ?? "所选班级";

    runCourseMutation(
      () =>
        addCourseClassAssociationAction({
          courseId: course.id,
          classId: selectedClassId,
        }),
      () => `已将课程关联到 ${selectedClassName}。`,
    );
  };

  const removeClassAssociation = (classId: string, className: string) => {
    runCourseMutation(
      () =>
        removeCourseClassAssociationAction({
          courseId: course.id,
          classId,
        }),
      () => `已解除与 ${className} 的课程关联。`,
    );
  };

  const addCourseMember = (studentId: string, studentName: string) => {
    runCourseMutation(
      () =>
        addCourseEnrollmentAction({
          courseId: course.id,
          studentId,
        }),
      () => `已将 ${studentName} 加入当前课程。`,
    );
  };

  const removeCourseMember = (studentId: string, studentName: string) => {
    runCourseMutation(
      () =>
        removeCourseEnrollmentAction({
          courseId: course.id,
          studentId,
        }),
      () => `已将 ${studentName} 移出当前课程。`,
    );
  };

  const deleteCourse = () => {
    setError("");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await deleteCourseAction({
        courseId: course.id,
        confirmationText: deleteConfirmation.trim(),
      });

      if (!result.ok) {
        if (result.error === "DELETE_BLOCKED" && "reasons" in result) {
          setSavedCourse((current) => ({
            ...current,
            deleteEligibility: {
              canDelete: false,
              reasons: result.reasons,
            },
          }));
        }
        setError(result.message);
        return;
      }

      router.push("/teacher/courses");
    });
  };

  return (
    <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
      <p className="text-sm text-on-surface-variant">课程信息编辑</p>
      <h3 className="mt-2 text-2xl font-semibold text-on-surface">在详情页内直接更新课程基础信息</h3>

      {successMessage ? (
        <div className="mt-5 rounded-[1.5rem] bg-[rgba(78,167,114,0.14)] px-4 py-4 text-sm leading-7 text-on-surface">
          <p className="font-semibold text-[#1f6a3d]">{successMessage}</p>
          <p className="mt-2 text-on-surface-variant">
            当前课程：{form.title} · {form.subject} · {form.grade} · {getCourseStatusLabel(currentStatus)}
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
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-surface-container-low px-4 py-4 shadow-ambient">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-on-surface-variant">课程生命周期</p>
            <p className="mt-2 text-base font-semibold text-on-surface">当前状态：{getCourseStatusLabel(currentStatus)}</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">{getCourseStatusHint(currentStatus)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {currentStatus === "draft" ? (
              <Button className="min-w-[9rem]" onClick={publishCourse} disabled={isPending}>
                发布课程
              </Button>
            ) : (
              <Button className="min-w-[9rem]" onClick={restoreDraft} disabled={isPending}>
                恢复为草稿
              </Button>
            )}

            {currentStatus !== "archived" ? (
              <Button variant="secondary" className="min-w-[9rem]" onClick={archiveCourse} disabled={isPending}>
                归档课程
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-surface-container-low px-4 py-4 shadow-ambient">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-on-surface-variant">班级关联管理</p>
            <p className="mt-2 text-base font-semibold text-on-surface">在课程详情页内维护课程与班级的关联</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              这里只处理课程与班级的 add/remove，不触及学生 enrollment。
            </p>
          </div>

          {classLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="已关联班级列表">
              {classLinks.map((classLink) => (
                <div
                  key={classLink.id}
                  className="flex items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-2 text-sm text-on-surface"
                >
                  <span className="font-medium">{classLink.name}</span>
                  <Button
                    type="button"
                    variant="tertiary"
                    className="min-h-0 px-2 py-1 text-xs"
                    onClick={() => removeClassAssociation(classLink.id, classLink.name)}
                    disabled={isPending}
                  >
                    移除
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm leading-7 text-on-surface-variant">
              当前还没有关联班级，可直接在下方选择本校班级并添加。
            </p>
          )}

          {availableClasses.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="grid gap-2">
                <label htmlFor="course-detail-association-class" className="text-sm font-medium text-on-surface">
                  添加班级关联
                </label>
                <select
                  id="course-detail-association-class"
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className={ghostSelectFieldClassName}
                  disabled={isPending}
                >
                  {availableClasses.map((classOption) => (
                    <option key={classOption.id} value={classOption.id}>
                      {classOption.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" className="min-w-[9rem]" onClick={addClassAssociation} disabled={isPending || !selectedClassId}>
                添加班级关联
              </Button>
            </div>
          ) : (
            <p className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm leading-7 text-on-surface-variant">
              当前学校下没有更多可添加的班级，或该课程已关联全部可用班级。
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-surface-container-low px-4 py-4 shadow-ambient">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-on-surface-variant">课程成员管理</p>
            <p className="mt-2 text-base font-semibold text-on-surface">在课程详情页内维护这门课程的学生范围</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              在课程详情页内维护这门课程的学生范围，不会改动班级原始名册。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <p className="text-on-surface-variant">当前成员</p>
              <p className="mt-2 text-lg font-semibold">{enrollmentCount} 名</p>
            </div>
            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <p className="text-on-surface-variant">可添加学生</p>
              <p className="mt-2 text-lg font-semibold">{eligibleStudents.length} 名</p>
            </div>
            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface">
              <p className="text-on-surface-variant">当前筛选结果</p>
              <p className="mt-2 text-lg font-semibold">{filteredEligibleStudents.length} 名</p>
            </div>
          </div>

          {membershipReadOnly ? (
            <p className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm leading-7 text-on-surface-variant">
              归档课程仅支持查看成员，暂不支持修改。你仍可查看当前成员与删除阻断项，再决定是否先恢复为草稿。
            </p>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4">
              <p className="text-sm font-medium text-on-surface">当前成员</p>
              {members.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3" aria-label="课程当前成员列表">
                  {members.map((member) => (
                    <div key={member.studentId} className="min-w-[220px] rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                      <p className="font-semibold">{member.studentName}</p>
                      <p className="mt-1 text-on-surface-variant">学号：{member.studentNumber}</p>
                      <p className="mt-1 text-on-surface-variant">班级：{member.classLabels.join("、") || "未标注班级"}</p>
                      <Button
                        type="button"
                        variant="tertiary"
                        className="mt-3 min-h-10 px-0 text-sm text-[#b42318]"
                        onClick={() => removeCourseMember(member.studentId, member.studentName)}
                        disabled={isPending || membershipReadOnly}
                        aria-label={`移出课程：${member.studentName}`}
                      >
                        移出课程
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.25rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                  <p className="font-semibold text-on-surface">这门课程还没有学生成员</p>
                  <p className="mt-2">
                    先从可管理的学生范围中添加成员，课程删除校验和后续课堂参与范围都会基于这里的成员记录。
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-4">
              <p className="text-sm font-medium text-on-surface">加入课程</p>
              <div className="mt-4 grid gap-2">
                <label htmlFor="course-member-search" className="text-sm font-medium text-on-surface">
                  搜索学生姓名或学号
                </label>
                <input
                  id="course-member-search"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  className={ghostTextFieldClassName}
                  placeholder="搜索学生姓名或学号"
                  disabled={isPending || membershipReadOnly}
                />
              </div>

              <div className="mt-4 space-y-3" aria-label="可添加学生列表">
                {eligibleStudents.length === 0 ? (
                  <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-7 text-on-surface-variant">
                    当前没有更多可添加的学生，或该课程已覆盖你可管理的学生范围。
                  </p>
                ) : filteredEligibleStudents.length === 0 ? (
                  <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm leading-7 text-on-surface-variant">
                    未找到符合条件的学生，请调整关键词，或先确认这门课程已关联正确班级。
                  </p>
                ) : (
                  filteredEligibleStudents.map((student) => (
                    <div key={student.studentId} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                      <p className="font-semibold">{student.studentName}</p>
                      <p className="mt-1 text-on-surface-variant">学号：{student.studentNumber}</p>
                      <p className="mt-1 text-on-surface-variant">班级：{student.classLabels.join("、") || "未标注班级"}</p>
                      <Button
                        type="button"
                        className="mt-3 min-h-11"
                        onClick={() => addCourseMember(student.studentId, student.studentName)}
                        disabled={isPending || membershipReadOnly}
                      >
                        加入课程
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-[#fff7f7] px-4 py-4 shadow-ambient">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-[#b42318]">危险操作</p>
            <p className="mt-2 text-base font-semibold text-on-surface">删除课程</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              删除不同于归档。课程删除后不可恢复，且不会保留在课程中心中继续查看。
            </p>
          </div>

          {deleteEligibility.canDelete ? (
            <div className="grid gap-3">
              <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                当前课程未检测到课时、班级关联或课程成员记录，可以执行删除。
              </p>
              <div className="grid gap-2">
                <label htmlFor="course-delete-confirmation" className="text-sm font-medium text-on-surface">
                  输入当前课程名称以确认删除
                </label>
                <input
                  id="course-delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className={ghostTextFieldClassName}
                  placeholder={savedCourse.title}
                  disabled={isPending}
                />
              </div>
              <p className="text-sm text-on-surface-variant">
                请输入“{savedCourse.title}”后才能删除课程。
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                当前课程暂不满足删除条件，请先处理以下阻断项。
              </p>
              <ul className="space-y-2" aria-label="课程删除阻断项">
                {deleteEligibility.reasons.map((reason) => (
                  <li key={reason.code} className="rounded-[1.25rem] bg-surface-container-low px-4 py-3 text-sm">
                    <p className="font-semibold text-on-surface">{reason.message}</p>
                    <p className="mt-1 text-on-surface-variant">
                      当前涉及 {reason.count} 条关联记录。
                      {reason.code === "COURSE_HAS_ENROLLMENTS" ? " 请先在上方课程成员管理区清理学生关联。" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
        <Button variant="secondary" className="min-w-[9rem]" onClick={resetForm} disabled={isPending}>
          还原当前视图
        </Button>
        <Button
          variant="secondary"
          className="min-w-[9rem] bg-[#fef2f2] text-[#b42318] shadow-none hover:bg-[#fee4e2]"
          onClick={deleteCourse}
          disabled={isPending || !deleteEligibility.canDelete || !deleteConfirmationMatches}
        >
          删除课程
        </Button>
      </div>
    </div>
  );
}
