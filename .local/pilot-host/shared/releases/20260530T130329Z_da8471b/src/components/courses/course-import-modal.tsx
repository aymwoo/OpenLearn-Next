"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { draftCourseImportAction } from "@/actions/course-import-actions";
import { Button } from "@/components/ui/button";
import { getNativeDialogClassName, useNativeDialogBackdropClose } from "@/components/ui/native-dialog";
import { useToast } from "@/components/ui/toast";
import { COURSE_IMPORT_COLUMN_MAP, normalizeCourseImportColumnHeader } from "@/lib/course-import-template";

type ParsedCourseImportRow = {
  title?: string;
  subject?: string;
  grade?: string;
  status?: string;
};

type Props = {
  schoolId: string | null;
};

export function CourseImportModal({ schoolId }: Props) {
  const router = useRouter();
  const { success } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openModal = () => {
    setErrorMessage(null);
    dialogRef.current?.showModal();
  };

  const closeModal = () => dialogRef.current?.close();
  const handleDialogBackdropClose = useNativeDialogBackdropClose(dialogRef, closeModal);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !schoolId) {
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data
          .map((raw) => {
            const mapped: ParsedCourseImportRow = {};
            for (const [key, value] of Object.entries(raw)) {
              const normalizedKey = normalizeCourseImportColumnHeader(key);
              const englishKey = COURSE_IMPORT_COLUMN_MAP[normalizedKey as keyof typeof COURSE_IMPORT_COLUMN_MAP] ?? normalizedKey;

              if (englishKey === "title" || englishKey === "subject" || englishKey === "grade" || englishKey === "status") {
                mapped[englishKey] = typeof value === "string" ? value.trim() : "";
              }
            }

            return mapped;
          })
          .filter(
            (row): row is Required<ParsedCourseImportRow> =>
              Boolean(row.title && row.subject && row.grade && row.status),
          );

        if (rows.length === 0) {
          setErrorMessage("未识别到有效的课程导入行，请检查 CSV 是否使用了固定模板。");
          return;
        }

        startTransition(async () => {
          const result = await draftCourseImportAction({
            schoolId,
            sourceType: "csv",
            sourceLabel: file.name,
            rows,
          });

          if (!result.ok) {
            setErrorMessage(result.message);
            return;
          }

          closeModal();
          success("课程导入草稿已生成", {
            description: "正在进入审核台继续处理命中、重复与结果说明。",
          });
          router.push(`/teacher/courses/import/${(result.data as { id: string }).id}`);
          router.refresh();
        });
      },
      error: (error) => {
        setErrorMessage(`CSV 解析失败：${error.message}`);
      },
    });

    event.target.value = "";
  }

  return (
    <>
      <Button onClick={openModal} className="gap-2" disabled={!schoolId}>
        <Upload className="size-4" aria-hidden />
        批量导入课程
      </Button>

      <dialog
        ref={dialogRef}
        className={getNativeDialogClassName("lg", "min-w-[20rem] open:animate-in open:fade-in-0 open:zoom-in-95")}
        onClick={handleDialogBackdropClose}
      >
        <div className="w-full p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Upload className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-on-surface">批量导入课程</h2>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="grid size-8 place-items-center rounded-full text-on-surface-variant transition hover:bg-surface-container-high"
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
            <p>
              固定模板列为 <strong>标题、学科、年级、课程状态</strong>。上传后不会直接写课程，而是先生成审核批次。
            </p>
            <p>
              命中已有课程时，只允许在审核台里选择 <strong>更新</strong> 或 <strong>跳过</strong>。
            </p>
          </div>

          {errorMessage ? <div className="mt-4 rounded-[var(--radius-card)] bg-error-container px-4 py-3 text-sm text-on-error-container">{errorMessage}</div> : null}

          <div className="mt-6 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-highest">
              选择 CSV 文件
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} disabled={isPending || !schoolId} />
            </label>
            <Link href="/teacher/courses/import/template" className="text-sm text-primary underline underline-offset-2">
              下载 CSV 模板
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
