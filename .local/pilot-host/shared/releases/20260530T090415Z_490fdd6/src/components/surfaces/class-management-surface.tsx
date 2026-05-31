"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Check,
  CheckCircle2,
  Download,
  FileUp,
  Filter,
  Grid3X3,
  KeyRound,
  List,
  Pencil,
  Plus,
  Search,
  School,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  deleteClassesAction,
  deleteStudentsAction,
  importClassRosterAction,
  importClassesAction,
  resetStudentPasswordsAction,
  updateClassNameAction,
} from "@/actions/class-management-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNativeDialogClassName, useNativeDialogBackdropClose } from "@/components/ui/native-dialog";
import { useToast } from "@/components/ui/toast";
import { teacherSurfaceRhythm } from "@/components/surfaces/teacher-surface-rhythm";
import type {
  ImportRosterRowInput,
  StudentGender,
  TeacherClassDTO,
  TeacherClassManagementDTO,
} from "@/lib/dto/class-management";
import { parseRosterImportCsv } from "@/features/class-management/roster-csv";
import { cn } from "@/lib/utils";

type ClassManagementSurfaceProps = {
  data: TeacherClassManagementDTO;
};

type PendingRosterImport = {
  rows: ImportRosterRowInput[];
  missingClassNames: string[];
};

type StudentViewMode = "cards" | "list";

type StudentStatus = "已分配" | "未分配";

type ClassStatus = "已配" | "待导";

type StudentRecord = TeacherClassDTO["students"][number] & {
  progressValue: number;
  status: StudentStatus;
};

function getStudentProgressValue(studentNumber: string) {
  const numericSeed = Array.from(studentNumber).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 58 + (numericSeed % 39);
}

function getStudentStatus(progressValue: number): StudentStatus {
  return progressValue >= 72 ? "已分配" : "未分配";
}

function buildRosterCsv(className: string, students: StudentRecord[]) {
  const rows = students.map(
    (student) => `${className},${student.name},${student.studentNumber},${formatStudentGenderForCsv(student.gender)}`,
  );
  return ["className,studentName,studentNumber,gender", ...rows].join("\n");
}

function formatStudentGenderForCsv(gender: StudentGender | null) {
  if (gender === "female") {
    return "女";
  }

  if (gender === "male") {
    return "男";
  }

  return "";
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseClassCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function getStudentDefaultAvatarSrc(gender: StudentGender | null) {
  return gender === "female" ? "/avatars/student-girl.svg" : "/avatars/student-boy.svg";
}

function getClassStatus(studentCount: number): ClassStatus {
  return studentCount > 0 ? "已配" : "待导";
}

function getClassStatusButtonClass(studentCount: number) {
  return studentCount > 0
    ? "bg-primary"
    : "bg-tertiary";
}

export function ClassManagementSurface({ data }: ClassManagementSurfaceProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [localClasses, setLocalClasses] = useState<TeacherClassDTO[] | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [pendingRosterImport, setPendingRosterImport] = useState<PendingRosterImport | null>(null);
  const [studentViewMode, setStudentViewMode] = useState<StudentViewMode>("cards");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | StudentStatus>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [classQuery, setClassQuery] = useState("");
  const [classStatusFilter, setClassStatusFilter] = useState<"all" | ClassStatus>("all");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [confirmingDeleteClassId, setConfirmingDeleteClassId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const studentDialogRef = useRef<HTMLDialogElement>(null);
  const classImportInputRef = useRef<HTMLInputElement>(null);
  const rosterImportInputRef = useRef<HTMLInputElement>(null);
  const createClassDialogRef = useRef<HTMLDialogElement>(null);
  const resetPasswordDialogRef = useRef<HTMLDialogElement>(null);

  const classes = localClasses ?? data.classes;

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  const totalStudents = useMemo(
    () => classes.reduce((sum, item) => sum + item.studentCount, 0),
    [classes],
  );

  const filteredClasses = useMemo(() => {
    const normalizedQuery = classQuery.trim().toLowerCase();

    return classes.filter((item) => {
      const status = getClassStatus(item.studentCount);
      const matchesQuery = normalizedQuery.length === 0 || item.name.toLowerCase().includes(normalizedQuery);
      const matchesStatus = classStatusFilter === "all" || status === classStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [classQuery, classStatusFilter, classes]);

  const selectedClassStudents = useMemo<StudentRecord[]>(() => {
    if (!selectedClass) {
      return [];
    }

    return selectedClass.students.map((student) => {
      const progressValue = getStudentProgressValue(student.studentNumber);
      return {
        ...student,
        progressValue,
        status: getStudentStatus(progressValue),
      };
    });
  }, [selectedClass]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = studentQuery.trim().toLowerCase();

    return selectedClassStudents.filter((student) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        student.name.toLowerCase().includes(normalizedQuery) ||
        student.studentNumber.toLowerCase().includes(normalizedQuery);
      const matchesStatus = studentStatusFilter === "all" || student.status === studentStatusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [selectedClassStudents, studentQuery, studentStatusFilter]);

  const isAllFilteredStudentsSelected =
    filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.userId));

  const isAllFilteredClassesSelected =
    filteredClasses.length > 0 && filteredClasses.every((item) => selectedClassIds.includes(item.id));

  const averageStudentsPerClass = classes.length > 0 ? (totalStudents / classes.length).toFixed(0) : "0";

  const openStudentModal = useCallback((classId: string) => {
    setSelectedClassId(classId);
    setStudentViewMode("cards");
    setStudentQuery("");
    setStudentStatusFilter("all");
    setSelectedStudentIds([]);
  }, []);

  const closeStudentModal = useCallback(() => {
    setSelectedClassId(null);
  }, []);

  useEffect(() => {
    const dialog = studentDialogRef.current;
    if (!dialog) {
      return;
    }

    if (selectedClassId) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [selectedClassId]);

  const closeCreateClassDialog = useCallback(() => {
    createClassDialogRef.current?.close();
  }, []);
  const closeResetPasswordDialog = useCallback(() => {
    resetPasswordDialogRef.current?.close();
    setResetPasswordValue("");
  }, []);
  const handleStudentDialogBackdropClose = useNativeDialogBackdropClose(studentDialogRef, closeStudentModal);
  const handleCreateClassDialogBackdropClose = useNativeDialogBackdropClose(
    createClassDialogRef,
    closeCreateClassDialog,
  );
  const handleResetPasswordDialogBackdropClose = useNativeDialogBackdropClose(
    resetPasswordDialogRef,
    closeResetPasswordDialog,
  );

  const handleEditClassName = useCallback(
    (classItem: TeacherClassDTO) => {
      setEditingClassId(classItem.id);
      setDraftNames((current) => ({ ...current, [classItem.id]: current[classItem.id] ?? classItem.name }));
      openStudentModal(classItem.id);
    },
    [openStudentModal],
  );

  const handleSaveClassName = useCallback(
    (classId: string) => {
      const nextName = draftNames[classId]?.trim();
      if (!nextName) {
        error("班级名称不能为空");
        return;
      }

      startTransition(async () => {
        const result = await updateClassNameAction({ classId, name: nextName });
        if (!result.ok) {
          error(result.message);
          return;
        }

        setLocalClasses(classes.map((item) => (item.id === classId ? { ...item, name: result.data.name } : item)));
        setEditingClassId(null);
        router.refresh();
        success("班级名称已更新", { description: `已保存为“${result.data.name}”。` });
      });
    },
    [classes, draftNames, error, router, success],
  );

  const handleClassImport = useCallback(
    async (file: File) => {
      const classNames = [...new Set(parseClassCsv(await file.text()))];
      if (classNames.length === 0) {
        error("未识别到班级数据", { description: "请按模板填写班级名称后重新导入。" });
        return;
      }

      startTransition(async () => {
        const result = await importClassesAction({ schoolId: data.schoolId, classNames });
        if (!result.ok) {
          error(result.message);
          return;
        }

        const refreshedClassList = [...classes];
        for (const className of classNames) {
          if (!refreshedClassList.some((item) => item.name === className)) {
            refreshedClassList.push({
              id: `temp-${className}`,
              schoolId: data.schoolId,
              name: className,
              studentCount: 0,
              students: [],
            });
          }
        }

        setLocalClasses(refreshedClassList.sort((left, right) => left.name.localeCompare(right.name, "zh-CN")));
        router.refresh();
        success("班级导入完成", {
          description: `已新增 ${result.data.createdCount} 个班级，跳过 ${result.data.skippedCount} 个已存在班级。`,
        });
      });
    },
    [classes, data.schoolId, error, router, success],
  );

  const handleRosterImport = useCallback(
    async (file: File) => {
      const rows = parseRosterImportCsv(await file.text());
      if (rows.length === 0) {
        error("未识别到学生名册", { description: "请使用 className,studentName,studentNumber,gender 模板。" });
        return;
      }

      startTransition(async () => {
        const result = await importClassRosterAction({
          schoolId: data.schoolId,
          rows,
          createMissingClasses: false,
        });

        if (!result.ok && result.error === "MISSING_CLASSES") {
          setPendingRosterImport({ rows, missingClassNames: result.missingClassNames ?? [] });
          createClassDialogRef.current?.showModal();
          return;
        }

        if (!result.ok) {
          error(result.message);
          return;
        }

        success("学生名册导入完成", {
          description: `已创建 ${result.data.createdStudentCount} 个学生并关联 ${result.data.linkedStudentCount} 条班级关系。`,
        });
        router.refresh();
      });
    },
    [data.schoolId, error, router, success],
  );

  const handleCreateMissingClassAndImport = useCallback(() => {
    if (!pendingRosterImport) {
      return;
    }

    startTransition(async () => {
      const result = await importClassRosterAction({
        schoolId: data.schoolId,
        rows: pendingRosterImport.rows,
        createMissingClasses: true,
      });

      if (!result.ok) {
        error(result.message);
        return;
      }

      closeCreateClassDialog();
      setPendingRosterImport(null);
      router.refresh();
      success("已创建新班级并导入学生", {
        description: `已新建 ${result.data.createdClassCount} 个班级，并关联 ${result.data.linkedStudentCount} 条学生记录。`,
      });
    });
  }, [closeCreateClassDialog, data.schoolId, error, pendingRosterImport, router, success]);

  const toggleStudentSelection = useCallback((studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId],
    );
  }, []);

  const toggleSelectAllFilteredStudents = useCallback(() => {
    setSelectedStudentIds((current) => {
      if (filteredStudents.length === 0) {
        return current;
      }

      const filteredIds = filteredStudents.map((student) => student.userId);
      const next = new Set(current);

      if (filteredIds.every((studentId) => next.has(studentId))) {
        filteredIds.forEach((studentId) => next.delete(studentId));
      } else {
        filteredIds.forEach((studentId) => next.add(studentId));
      }

      return [...next];
    });
  }, [filteredStudents]);

  const toggleClassSelection = useCallback((classId: string) => {
    setSelectedClassIds((current) =>
      current.includes(classId) ? current.filter((item) => item !== classId) : [...current, classId],
    );
  }, []);

  const toggleSelectAllFilteredClasses = useCallback(() => {
    setSelectedClassIds((current) => {
      if (filteredClasses.length === 0) {
        return current;
      }

      const filteredIds = filteredClasses.map((item) => item.id);
      const next = new Set(current);

      if (filteredIds.every((classId) => next.has(classId))) {
        filteredIds.forEach((classId) => next.delete(classId));
      } else {
        filteredIds.forEach((classId) => next.add(classId));
      }

      return [...next];
    });
  }, [filteredClasses]);

  const handleExportStudents = useCallback((students: StudentRecord[]) => {
    if (!selectedClass || students.length === 0) {
      error("暂无可导出的学生", { description: "请先调整筛选条件或选择学生。" });
      return;
    }

    const safeClassName = selectedClass.name.replace(/[\\/:*?"<>|]/g, "-");
    downloadCsv(`${safeClassName}-students.csv`, buildRosterCsv(selectedClass.name, students));
    success("学生名册已导出", { description: `已导出 ${students.length} 名学生。` });
  }, [error, selectedClass, success]);

  const handleExportSelectedStudents = useCallback(() => {
    const students = filteredStudents.filter((student) => selectedStudentIds.includes(student.userId));
    handleExportStudents(students);
  }, [filteredStudents, handleExportStudents, selectedStudentIds]);

  const handleExportClassRoster = useCallback(
    (classItem: TeacherClassDTO) => {
      const safeClassName = classItem.name.replace(/[\\/:*?"<>|]/g, "-");
      const students = classItem.students.map((student) => {
        const progressValue = getStudentProgressValue(student.studentNumber);
        return {
          ...student,
          progressValue,
          status: getStudentStatus(progressValue),
        };
      });

      downloadCsv(`${safeClassName}-students.csv`, buildRosterCsv(classItem.name, students));
      success("班级名册已导出", { description: `已导出 ${students.length} 名学生。` });
    },
    [success],
  );

  const selectedFilteredStudentIds = useMemo(
    () => filteredStudents.filter((student) => selectedStudentIds.includes(student.userId)).map((student) => student.userId),
    [filteredStudents, selectedStudentIds],
  );

  const selectedFilteredClassIds = useMemo(
    () => filteredClasses.filter((item) => selectedClassIds.includes(item.id)).map((item) => item.id),
    [filteredClasses, selectedClassIds],
  );

  const openResetPasswordDialog = useCallback(() => {
    if (selectedFilteredStudentIds.length === 0) {
      error("请先选择学生", { description: "列表模式下可勾选后进行批量重置密码。" });
      return;
    }

    setResetPasswordValue("");
    resetPasswordDialogRef.current?.showModal();
  }, [error, selectedFilteredStudentIds.length]);

  const handleConfirmResetPasswords = useCallback(() => {
    const nextPassword = resetPasswordValue.trim();

    if (!nextPassword) {
      error("请输入新密码");
      return;
    }

    startTransition(async () => {
      const result = await resetStudentPasswordsAction({
        studentIds: selectedFilteredStudentIds,
        password: nextPassword,
      });

      if (!result.ok) {
        error(result.message);
        return;
      }

      closeResetPasswordDialog();
      success("密码已重置", { description: `已更新 ${result.data.updatedCount} 名学生的密码。` });
      router.refresh();
    });
  }, [closeResetPasswordDialog, error, resetPasswordValue, router, selectedFilteredStudentIds, success]);

  const handleDeleteSelectedStudents = useCallback(() => {
    if (selectedFilteredStudentIds.length === 0) {
      error("请先选择学生", { description: "至少选择 1 名学生后才能删除。" });
      return;
    }

    startTransition(async () => {
      const result = await deleteStudentsAction({ studentIds: selectedFilteredStudentIds });

      if (!result.ok) {
        error(result.message);
        return;
      }

      setSelectedStudentIds((current) => current.filter((id) => !selectedFilteredStudentIds.includes(id)));
      success("学生已删除", { description: `已删除 ${result.data.deletedCount} 名学生。` });
      router.refresh();
    });
  }, [error, router, selectedFilteredStudentIds, success]);

  const handleDeleteSelectedClasses = useCallback(() => {
    if (selectedFilteredClassIds.length === 0) {
      error("请先选择班级", { description: "至少选择 1 个班级后才能删除。" });
      return;
    }

    startTransition(async () => {
      setConfirmingDeleteClassId(null);
      const result = await deleteClassesAction({ classIds: selectedFilteredClassIds });

      if (!result.ok) {
        error(result.message);
        return;
      }

      setLocalClasses(classes.filter((item) => !selectedFilteredClassIds.includes(item.id)));
      setSelectedClassIds((current) => current.filter((id) => !selectedFilteredClassIds.includes(id)));
      if (selectedClassId && selectedFilteredClassIds.includes(selectedClassId)) {
        closeStudentModal();
        setSelectedClassId(null);
      }
      success("班级已删除", { description: `已删除 ${result.data.deletedCount} 个班级。` });
      router.refresh();
    });
  }, [classes, closeStudentModal, error, router, selectedClassId, selectedFilteredClassIds, success]);

  const handleDeleteClass = useCallback(
    (classItem: TeacherClassDTO) => {
      startTransition(async () => {
        setConfirmingDeleteClassId(null);
        const result = await deleteClassesAction({ classIds: [classItem.id] });

        if (!result.ok) {
          error(result.message);
          return;
        }

        setLocalClasses(classes.filter((item) => item.id !== classItem.id));
        setSelectedClassIds((current) => current.filter((id) => id !== classItem.id));
        if (selectedClassId === classItem.id) {
          closeStudentModal();
          setSelectedClassId(null);
        }
        success("班级已删除", { description: `已删除“${classItem.name}”。` });
        router.refresh();
      });
    },
    [classes, closeStudentModal, error, router, selectedClassId, success],
  );

  return (
    <>
      <div className={cn("mx-auto flex w-full flex-col pb-10 pt-2", teacherSurfaceRhythm.stack)}>
        <section
          className={cn(
            "relative overflow-hidden bg-surface-container-low px-6 py-6 sm:px-8 sm:py-8",
            teacherSurfaceRhythm.shell,
          )}
        >
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary">班级管理</Badge>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-tertiary">
                  <CheckCircle2 className="size-4" aria-hidden />
                  当前共维护 {classes.length} 个班级
                </span>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.4rem]">
                  只显示班级列表
                </h1>
                <p className="text-sm text-on-surface-variant sm:text-base">
                  学生列表与班级维护统一在弹窗中完成。
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href="/teacher/classes/template"
                    download
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-high px-4 text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                  >
                    <Download className="size-4" aria-hidden />
                    下载班级导入模板
                  </a>
                  <a
                    href="/teacher/classes/roster-template"
                    download
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-high px-4 text-sm font-medium text-on-surface transition hover:bg-surface-container-highest"
                  >
                    <Download className="size-4" aria-hidden />
                    下载学生名册模板
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 pt-1">
                <Metric label="班级数量" value={String(classes.length)} />
                <Metric label="学生总数" value={String(totalStudents)} />
                <Metric label="平均每班" value={averageStudentsPerClass} />
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <input
                ref={classImportInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handleClassImport(file);
                  event.currentTarget.value = "";
                }}
              />
              <input
                ref={rosterImportInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handleRosterImport(file);
                  event.currentTarget.value = "";
                }}
              />

              <Button className="min-h-10 gap-2 px-5 text-sm" onClick={() => classImportInputRef.current?.click()} disabled={isPending}>
                <Upload className="size-4" aria-hidden />
                导入班级
              </Button>
              <Button
                variant="secondary"
                className="min-h-10 gap-2 bg-primary/10 px-5 text-sm text-primary shadow-none hover:bg-primary/15"
                onClick={() => rosterImportInputRef.current?.click()}
                disabled={isPending}
              >
                <FileUp className="size-4" aria-hidden />
                导入学生名册
              </Button>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-6 right-0 text-primary/10">
            <School className="size-36 sm:size-40" aria-hidden />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">班级列表</h2>
              <p className="mt-1 text-sm text-on-surface-variant">仅展示班级概览，学生维护在弹窗中完成。</p>
            </div>
            <Badge className="bg-surface-container-high px-3 py-1 text-on-surface-variant">更紧凑的班级视图</Badge>
          </div>

          <div className="rounded-[1.75rem] bg-surface-container-low p-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                  <input
                    type="search"
                    value={classQuery}
                    onChange={(event) => setClassQuery(event.target.value)}
                    placeholder="按班级名称搜索..."
                    className="min-h-10 w-full rounded-full bg-surface-container-high pl-9 pr-4 text-sm text-on-surface outline-none ring-1 ring-transparent transition focus:bg-surface-container-lowest focus:ring-primary/20"
                  />
                </div>
                <label className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-high px-3 text-sm text-on-surface-variant">
                  <Filter className="size-4 text-primary" aria-hidden />
                  <select
                    value={classStatusFilter}
                    onChange={(event) => setClassStatusFilter(event.target.value as "all" | ClassStatus)}
                    className="bg-transparent text-sm text-on-surface outline-none"
                  >
                    <option value="all">所有班级</option>
                    <option value="已配">已配</option>
                    <option value="待导">待导</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={toggleSelectAllFilteredClasses}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-highest px-4 text-sm font-medium text-primary transition hover:bg-surface-container-high"
                >
                  {isAllFilteredClassesSelected ? "取消全选班级" : "全选当前班级"}
                </button>
                <Badge className="bg-surface-container-lowest text-on-surface-variant">
                  已选择 {selectedFilteredClassIds.length} 个班级
                </Badge>
                <Button
                  variant="secondary"
                  className="min-h-10 gap-2 px-4 text-sm shadow-none"
                  onClick={handleDeleteSelectedClasses}
                >
                  <Trash2 className="size-4" aria-hidden />
                  批量删除班级
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredClasses.map((item) => {
              const classStatus = getClassStatus(item.studentCount);
              const isSelected = selectedClassIds.includes(item.id);
              const isConfirmingDelete = confirmingDeleteClassId === item.id;

              return (
                <article
                  key={item.id}
                  className={cn(
                    teacherSurfaceRhythm.card,
                    "group/class-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 bg-surface-container-lowest px-2.5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.03)]",
                    isSelected && "ring-2 ring-primary/20",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <label className="flex w-5 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClassSelection(item.id)}
                          aria-label={`选择班级 ${item.name}`}
                          className="size-4 rounded border-none bg-surface-container-high text-primary opacity-0 transition-opacity focus:ring-primary/20 focus-visible:opacity-100 group-hover/class-row:opacity-100 group-focus-within/class-row:opacity-100"
                        />
                      </label>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-on-surface">{item.name}</h3>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap text-on-surface-variant",
                    )}
                  >
                    <span
                      className={cn("size-1.5 rounded-full", getClassStatusButtonClass(item.studentCount))}
                      aria-hidden
                    />
                    <span>{item.studentCount}人</span>
                    <span className="text-on-surface/55">{classStatus}</span>
                  </span>

                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openStudentModal(item.id)}
                        className="grid size-7 place-items-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:bg-surface-container-highest hover:text-primary"
                        aria-label={`查看班级 ${item.name} 的学生`}
                        title="查看学生"
                      >
                        <Users className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClassName(item)}
                        className="grid size-7 place-items-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:bg-surface-container-highest hover:text-primary"
                        aria-label={`编辑班级 ${item.name}`}
                        title="编辑名称"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportClassRoster(item)}
                        className="grid size-7 place-items-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:bg-surface-container-highest hover:text-primary"
                        aria-label={`导出班级 ${item.name} 的学生名册`}
                        title="导出名册"
                      >
                        <Download className="size-3.5" aria-hidden />
                      </button>
                    {isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(item)}
                            className="grid size-7 place-items-center rounded-full bg-destructive/12 text-destructive transition hover:bg-destructive/18 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`确认删除班级 ${item.name}`}
                            title="确认删除"
                            disabled={isPending}
                          >
                            <Check className="size-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteClassId(null)}
                            className="grid size-7 place-items-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:bg-surface-container-highest hover:text-on-surface"
                            aria-label={`取消删除班级 ${item.name}`}
                            title="取消删除"
                            disabled={isPending}
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteClassId(item.id)}
                          className="grid size-7 place-items-center rounded-full bg-surface-container-high text-on-surface-variant transition hover:bg-destructive/12 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`删除班级 ${item.name}`}
                          title="删除班级"
                          disabled={isPending}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
                </article>
              );
            })}
          </div>

          {filteredClasses.length === 0 ? (
            <div className="rounded-[1.25rem] bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
              当前筛选条件下没有匹配的班级，请调整搜索或状态筛选。
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2 text-xs text-on-surface-variant">
            <Download className="size-4" aria-hidden />
            支持导入班级与学生名册。
          </div>
        </section>
      </div>

      <dialog
        ref={studentDialogRef}
        className={getNativeDialogClassName(studentViewMode === "list" ? "2xl" : "xl")}
        onClick={handleStudentDialogBackdropClose}
        onClose={() => setSelectedClassId(null)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold text-on-surface">学生列表</h2>
              </div>
              <p className="mt-2 text-sm text-on-surface-variant">{selectedClass ? `当前班级：${selectedClass.name}` : "未选择班级"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full bg-surface-container-low p-1">
                <button
                  type="button"
                  onClick={() => setStudentViewMode("cards")}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                    studentViewMode === "cards"
                      ? "bg-surface-container-lowest text-primary shadow-[0_6px_18px_rgba(44,47,49,0.06)]"
                      : "text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  <Grid3X3 className="size-3.5" aria-hidden />
                  卡片
                </button>
                <button
                  type="button"
                  onClick={() => setStudentViewMode("list")}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                    studentViewMode === "list"
                      ? "bg-surface-container-lowest text-primary shadow-[0_6px_18px_rgba(44,47,49,0.06)]"
                      : "text-on-surface-variant hover:bg-surface-container-high",
                  )}
                >
                  <List className="size-3.5" aria-hidden />
                  列表
                </button>
              </div>
              <button
                type="button"
                onClick={closeStudentModal}
                className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
                aria-label="关闭学生列表"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          {selectedClass ? (
            <>
              <div className={cn(teacherSurfaceRhythm.card, "mt-5 bg-surface-container-low p-4")}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">班级名称</label>
                    <input
                      type="text"
                      value={draftNames[selectedClass.id] ?? selectedClass.name}
                      onChange={(event) =>
                        setDraftNames((current) => ({
                          ...current,
                          [selectedClass.id]: event.target.value,
                        }))
                      }
                      className="mt-2 min-h-11 w-full rounded-[1rem] bg-surface-container-lowest px-4 text-sm text-on-surface outline-none ring-1 ring-transparent transition focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingClassId === selectedClass.id ? (
                      <Button className="min-h-10 px-4 text-sm" onClick={() => handleSaveClassName(selectedClass.id)} disabled={isPending}>
                        保存名称
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.75rem] bg-surface-container-low p-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden />
                        <input
                          type="search"
                          value={studentQuery}
                          onChange={(event) => setStudentQuery(event.target.value)}
                          placeholder="按姓名或学号搜索..."
                          className="min-h-10 w-full rounded-full bg-surface-container-high pl-9 pr-4 text-sm text-on-surface outline-none ring-1 ring-transparent transition focus:bg-surface-container-lowest focus:ring-primary/20"
                        />
                      </div>
                      <label className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-high px-3 text-sm text-on-surface-variant">
                        <Filter className="size-4 text-primary" aria-hidden />
                        <select
                          value={studentStatusFilter}
                          onChange={(event) => setStudentStatusFilter(event.target.value as "all" | StudentStatus)}
                          className="bg-transparent text-sm text-on-surface outline-none"
                        >
                          <option value="all">所有状态</option>
                          <option value="已分配">已分配</option>
                          <option value="未分配">未分配</option>
                        </select>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Button
                        variant="secondary"
                        className="min-h-10 gap-2 px-4 text-sm shadow-none"
                        onClick={() => handleExportStudents(filteredStudents)}
                      >
                        <Download className="size-4" aria-hidden />
                        导出当前结果
                      </Button>
                      {studentViewMode === "list" ? (
                        <Button
                          variant="secondary"
                          className="min-h-10 gap-2 px-4 text-sm shadow-none"
                          onClick={handleExportSelectedStudents}
                        >
                          <Download className="size-4" aria-hidden />
                          导出选中
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {studentViewMode === "list" && selectedFilteredStudentIds.length > 0 ? (
                  <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-surface-container-high px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center gap-2 text-sm text-on-surface">
                      <Badge className="bg-surface-container-lowest text-primary">已选择 {selectedFilteredStudentIds.length} 名学生</Badge>
                      <span className="text-on-surface-variant">批量操作</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        className="min-h-10 gap-2 px-4 text-sm shadow-none"
                        onClick={openResetPasswordDialog}
                      >
                        <KeyRound className="size-4" aria-hidden />
                        重置密码
                      </Button>
                      <Button
                        variant="secondary"
                        className="min-h-10 gap-2 px-4 text-sm shadow-none"
                        onClick={handleDeleteSelectedStudents}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        删除学生
                      </Button>
                    </div>
                  </div>
                ) : null}

                {studentViewMode === "cards" ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.userId}
                        type="button"
                        onClick={() => toggleStudentSelection(student.userId)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-[1.5rem] bg-surface-container-lowest p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:bg-surface-bright",
                          selectedStudentIds.includes(student.userId) && "ring-2 ring-primary/20",
                        )}
                      >
                        <StudentProgressAvatar student={student} />
                        <div className="mt-1">
                          <div className="text-xs font-bold leading-tight text-on-surface">{student.name}</div>
                          <div className="text-[10px] text-on-surface-variant">{student.studentNumber}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 rounded-[1.75rem] bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={toggleSelectAllFilteredStudents}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-container-highest px-4 text-sm font-medium text-primary transition hover:bg-surface-container-high"
                        >
                          {isAllFilteredStudentsSelected ? "取消全选" : "全选当前结果"}
                        </button>
                        <Badge className="bg-surface-container-lowest text-on-surface-variant">
                          已选择 {selectedStudentIds.filter((id) => filteredStudents.some((student) => student.userId === id)).length} 名学生
                        </Badge>
                      </div>
                      <p className="text-xs text-on-surface-variant">列表模式支持按筛选结果批量导出与批量操作。</p>
                    </div>

                    <div className="space-y-3">
                      {filteredStudents.map((student) => {
                        const isSelected = selectedStudentIds.includes(student.userId);

                        return (
                          <article
                            key={student.userId}
                            className={cn(
                              teacherSurfaceRhythm.card,
                              "grid gap-4 bg-surface-container-low px-4 py-4 lg:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] lg:items-center",
                              isSelected && "ring-2 ring-primary/20",
                            )}
                          >
                            <label className="flex items-center justify-center lg:justify-start">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudentSelection(student.userId)}
                                className="size-4 rounded border-none bg-surface-container-high text-primary focus:ring-primary/20"
                              />
                            </label>

                            <div className="flex items-center gap-3">
                              <StudentProgressAvatar student={student} compact={false} />
                              <div>
                                <h3 className="text-sm font-semibold text-on-surface">{student.name}</h3>
                                <p className="text-xs text-on-surface-variant">学号：{student.studentNumber}</p>
                                <p className="text-xs text-on-surface-variant">性别：{formatStudentGenderForCsv(student.gender) || "未填写"}</p>
                              </div>
                            </div>

                            <MetaCell label="状态" value={student.status} />
                            <MetaCell label="进度边框" value={`${student.progressValue}%`} />
                            <MetaCell label="账号标识" value={student.userId} />
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div className="mt-5 rounded-[1.25rem] bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                  {selectedClass.students.length === 0
                    ? "当前班级暂无学生，导入学生名册后会显示在这里。"
                    : "当前筛选条件下没有匹配的学生，请调整搜索或状态筛选。"}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </dialog>

      <dialog
        ref={createClassDialogRef}
        className={getNativeDialogClassName("sm")}
        onClick={handleCreateClassDialogBackdropClose}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">班级不存在</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                在导入学生名册时发现以下班级不存在：
                {pendingRosterImport?.missingClassNames.length ? ` ${pendingRosterImport.missingClassNames.join("、")}` : " - "}
                。是否先创建新班级再继续导入？
              </p>
            </div>
            <button
              type="button"
              onClick={closeCreateClassDialog}
              className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
              aria-label="关闭创建班级确认框"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              className="min-h-10 px-4 text-sm shadow-none"
              onClick={() => {
                setPendingRosterImport(null);
                closeCreateClassDialog();
                error("已取消导入", { description: "请先创建班级后再重新导入学生名册。" });
              }}
            >
              取消
            </Button>
            <Button className="min-h-10 px-4 text-sm" onClick={handleCreateMissingClassAndImport} disabled={isPending}>
              <Plus className="size-4" aria-hidden />
              创建新班级并导入
            </Button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={resetPasswordDialogRef}
        className={getNativeDialogClassName("sm")}
        onClick={handleResetPasswordDialogBackdropClose}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-on-surface">批量重置密码</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                将为当前选中的 {selectedFilteredStudentIds.length} 名学生设置同一个新密码。学生登录使用学号 + 密码。
              </p>
            </div>
            <button
              type="button"
              onClick={closeResetPasswordDialog}
              className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
              aria-label="关闭重置密码确认框"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">新密码</label>
            <input
              type="password"
              value={resetPasswordValue}
              onChange={(event) => setResetPasswordValue(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-[1rem] bg-surface-container-low px-4 text-sm text-on-surface outline-none ring-1 ring-transparent transition focus:bg-surface-container-lowest focus:ring-primary/20"
              placeholder="请输入统一新密码"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              className="min-h-10 px-4 text-sm shadow-none"
              onClick={closeResetPasswordDialog}
            >
              取消
            </Button>
            <Button className="min-h-10 gap-2 px-4 text-sm" onClick={handleConfirmResetPasswords} disabled={isPending}>
              <KeyRound className="size-4" aria-hidden />
              确认重置
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[96px] flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
      <span className="text-xl font-semibold text-primary">{value}</span>
    </div>
  );
}

function MetaCell({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className={cn("uppercase tracking-[0.18em] text-on-surface-variant", compact ? "text-[11px]" : "text-xs")}>
        {label}
      </p>
      <p className={cn("font-medium text-on-surface", compact ? "mt-1 text-xs" : "mt-2 text-sm")}>{value}</p>
    </div>
  );
}

function StudentProgressAvatar({
  student,
  compact = true,
}: {
  student: StudentRecord;
  compact?: boolean;
}) {
  const sizeClass = compact ? "size-12" : "size-11";
  const innerSizeClass = compact ? "size-9 text-xs" : "size-9 text-sm";
  const strokeColor = student.progressValue >= 72 ? "text-primary" : "text-tertiary";
  const avatarSrc = getStudentDefaultAvatarSrc(student.gender);

  return (
    <div className={cn("relative flex items-center justify-center", sizeClass)}>
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <path
          className="text-surface-container-highest"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={strokeColor}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${student.progressValue}, 100`}
        />
      </svg>
      <div className={cn("relative z-10 overflow-hidden rounded-full bg-primary/10", innerSizeClass)}>
        <Image src={avatarSrc} alt="" aria-hidden fill sizes="44px" className="object-cover" />
      </div>
    </div>
  );
}
