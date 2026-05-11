"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { draftScheduleImportAction } from "@/features/schedule/import/actions";
import { SCHEDULE_IMPORT_COLUMN_MAP } from "@/features/schedule/import/template";
import type { ScheduleImportDraftRowInput } from "@/features/schedule/shared/dto/import";
import { cn } from "@/lib/utils";

type ImportStage = "idle" | "parsing" | "submitting" | "done" | "error";

interface StageInfo {
  label: string;
  description: string;
  icon: React.ReactNode;
}

const stageInfoMap: Record<ImportStage, StageInfo> = {
  idle: {
    label: "准备导入",
    description: "选择 CSV 文件开始导入流程",
    icon: <Upload className="size-8 text-on-surface-variant" aria-hidden />,
  },
  parsing: {
    label: "解析文件中",
    description: "正在解析 CSV 内容并进行字段映射…",
    icon: <Loader2 className="size-8 animate-spin text-on-surface-variant" aria-hidden />,
  },
  submitting: {
    label: "写入草稿中",
    description: "正在上传并生成导入批次…",
    icon: <Loader2 className="size-8 animate-spin text-on-surface-variant" aria-hidden />,
  },
  done: {
    label: "导入草稿已生成",
    description: "正在跳转到审核页…",
    icon: <CheckCircle2 className="size-8 text-primary" aria-hidden />,
  },
  error: {
    label: "导入失败",
    description: "处理过程中遇到错误",
    icon: <AlertCircle className="size-8 text-error" aria-hidden />,
  },
};

type ScheduleImportModalProps = {
  schoolId: string;
};

export function ScheduleImportModal({ schoolId }: ScheduleImportModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<ImportStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parsedRows, setParsedRows] = useState<number>(0);

  const openModal = useCallback(() => {
    dialogRef.current?.showModal();
    setStage("idle");
    setErrorMessage(null);
    setParsedRows(0);
  }, []);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const current = stageInfoMap[stage];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setStage("parsing");
    setErrorMessage(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ScheduleImportDraftRowInput[] = results.data
          .map((raw) => {
            const mapped: Partial<ScheduleImportDraftRowInput> = {};
            for (const [key, value] of Object.entries(raw)) {
              const englishKey = SCHEDULE_IMPORT_COLUMN_MAP[key as keyof typeof SCHEDULE_IMPORT_COLUMN_MAP];
              mapped[englishKey ?? key] = value as never;
            }
            return mapped;
          })
          .filter((row): row is ScheduleImportDraftRowInput =>
            Boolean(row.sourceRowKey && row.termName && row.className && row.courseTitle && row.teacherName),
          );

        setParsedRows(rows.length);

        if (rows.length === 0) {
          setStage("error");
          setErrorMessage("未识别到有效的导入行，请检查 CSV 格式是否符合模板要求。");
          return;
        }

        setStage("submitting");

        startTransition(async () => {
          const formData = new FormData();
          formData.append("schoolId", schoolId);
          formData.append("sourceType", "csv");
          formData.append("sourceLabel", file.name);
          formData.append("rows", JSON.stringify(rows));

          const result = await draftScheduleImportAction(formData);

          if (!result.ok) {
            setStage("error");
            setErrorMessage(result.message);
            return;
          }

          setStage("done");

          setTimeout(() => {
            closeModal();
            router.push(`/teacher/schedule/import`);
            router.refresh();
          }, 1200);
        });
      },
      error: (err) => {
        setStage("error");
        setErrorMessage(`CSV 解析失败：${err.message}`);
      },
    });

    e.target.value = "";
  }

  return (
    <>
      <Button onClick={openModal} className="gap-2">
        <Upload className="size-4" aria-hidden />
        导入课表
      </Button>

      <dialog
        ref={dialogRef}
        className="m-auto w-full max-w-md rounded-[var(--radius-shell)] bg-surface-container-lowest p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm open:animate-in open:fade-in-0 open:zoom-in-95"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Upload className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-on-surface">导入课表</h2>
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

          <div className="mt-6 flex flex-col items-center gap-4 py-6">
            {current.icon}
            <div className="text-center">
              <p className="text-base font-semibold text-on-surface">{current.label}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{current.description}</p>
            </div>

            {stage === "idle" && (
              <p className="text-center text-sm text-on-surface-variant">
                支持 CSV 格式课表导入。{" "}
                <a
                  href="/teacher/schedule/import/template"
                  className="text-primary underline underline-offset-2"
                  download
                >
                  下载导入模板
                </a>
              </p>
            )}

            {stage === "parsing" && parsedRows === 0 && (
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
              </div>
            )}

            {errorMessage && (
              <div className="mt-2 rounded-xl bg-error-container/60 p-3 text-sm text-error">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-3">
            {stage === "idle" && (
              <>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isPending}
                >
                  选择 CSV 文件
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    className="flex-1"
                    disabled={isPending}
                  >
                    取消
                  </Button>
                  <Button
                    variant="secondary"
                    asChild
                    className="flex-1"
                  >
                    <a href="/teacher/schedule/import/template" download>
                      下载模板
                    </a>
                  </Button>
                </div>
              </>
            )}

            {(stage === "parsing" || stage === "submitting" || stage === "done") && (
              <div className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
                {stage === "parsing" && `已解析行数：${parsedRows}`}
                {stage === "submitting" && `已解析 ${parsedRows} 行，正在写入…`}
                {stage === "done" && `已生成导入草稿，共 ${parsedRows} 行`}
              </div>
            )}

            {stage === "error" && (
              <Button onClick={() => setStage("idle")} variant="secondary" className="w-full">
                重新选择文件
              </Button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}