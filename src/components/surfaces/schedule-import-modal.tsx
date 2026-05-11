"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getNativeDialogClassName, useNativeDialogBackdropClose } from "@/components/ui/native-dialog";
import { useToast } from "@/components/ui/toast";
import { approveScheduleImportAction, draftScheduleImportAction } from "@/features/schedule/import/actions";
import { isScheduleImportTemplateSampleRow, normalizeScheduleImportColumnHeader, SCHEDULE_IMPORT_COLUMN_MAP } from "@/features/schedule/import/template";
import type { ScheduleImportBatchDTO, ScheduleImportRowReviewDTO } from "@/features/schedule/shared/dto/import";
import type { ScheduleImportDraftRowInput } from "@/features/schedule/shared/dto/import";

type ImportStage = "idle" | "parsing" | "submitting" | "done" | "error";

type BlockingGroupKey = "class_missing" | "course_missing" | "teacher_missing" | "conflict" | "other";

interface StageInfo {
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface BlockingFeedbackGroup {
  key: BlockingGroupKey;
  title: string;
  items: string[];
}

interface BlockingFeedback {
  summary: string;
  groups: BlockingFeedbackGroup[];
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
    label: "写入课表中",
    description: "正在上传、校验并写入主课表…",
    icon: <Loader2 className="size-8 animate-spin text-on-surface-variant" aria-hidden />,
  },
  done: {
    label: "课表导入完成",
    description: "正在返回主课表…",
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

const blockingStatuses = new Set<ScheduleImportRowReviewDTO["status"]>([
  "pending_review",
  "validation_failed",
  "mapping_review",
  "conflict_review",
]);

const blockingGroupOrder: BlockingGroupKey[] = ["class_missing", "course_missing", "teacher_missing", "conflict", "other"];

const blockingGroupTitleMap: Record<BlockingGroupKey, string> = {
  class_missing: "班级不存在",
  course_missing: "课程不存在",
  teacher_missing: "教师不存在",
  conflict: "冲突",
  other: "其他",
};

function getValidationIssueGroupKey(code: string): BlockingGroupKey {
  switch (code) {
    case "CLASS_NOT_FOUND":
      return "class_missing";
    case "COURSE_NOT_FOUND":
      return "course_missing";
    case "TEACHER_NOT_FOUND":
      return "teacher_missing";
    default:
      return "other";
  }
}

function buildBlockingFeedback(rows: ScheduleImportRowReviewDTO[]): BlockingFeedback {
  const groupedItems = new Map<BlockingGroupKey, string[]>();

  const addItem = (key: BlockingGroupKey, item: string) => {
    const existing = groupedItems.get(key);
    if (existing) {
      existing.push(item);
      return;
    }

    groupedItems.set(key, [item]);
  };

  for (const row of rows) {
    let hasBlockingReason = false;

    for (const issue of row.validationIssues) {
      addItem(getValidationIssueGroupKey(issue.code), `源记录 ${row.sourceRowKey}：${issue.message}`);
      hasBlockingReason = true;
    }

    for (const issue of row.conflictSummary) {
      addItem("conflict", `源记录 ${row.sourceRowKey}：${issue.description}`);
      hasBlockingReason = true;
    }

    if (!hasBlockingReason) {
      addItem("other", `源记录 ${row.sourceRowKey}：需要在导入审核台进一步处理。`);
    }
  }

  const groups = blockingGroupOrder
    .map((key) => {
      const items = groupedItems.get(key);
      if (!items || items.length === 0) {
        return null;
      }

      return {
        key,
        title: blockingGroupTitleMap[key],
        items,
      } satisfies BlockingFeedbackGroup;
    })
    .filter((group): group is BlockingFeedbackGroup => group !== null);

  return {
    summary: "导入已暂存，但还不能自动写入主课表。请先处理以下问题。",
    groups,
  };
}

export function ScheduleImportModal({ schoolId }: ScheduleImportModalProps) {
  const router = useRouter();
  const { success } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<ImportStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockingFeedback, setBlockingFeedback] = useState<BlockingFeedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parsedRows, setParsedRows] = useState<number>(0);

  const openModal = useCallback(() => {
    dialogRef.current?.showModal();
    setStage("idle");
    setErrorMessage(null);
    setBlockingFeedback(null);
    setParsedRows(0);
  }, []);

  const closeModal = useCallback(() => {
    dialogRef.current?.close();
  }, []);
  const handleDialogBackdropClose = useNativeDialogBackdropClose(dialogRef, closeModal);

  const current = stageInfoMap[stage];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setStage("parsing");
    setErrorMessage(null);
    setBlockingFeedback(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ScheduleImportDraftRowInput[] = results.data
          .map((raw) => {
            const mapped: Partial<ScheduleImportDraftRowInput> = {};
            for (const [key, value] of Object.entries(raw)) {
              const normalizedKey = normalizeScheduleImportColumnHeader(key);
              const englishKey = SCHEDULE_IMPORT_COLUMN_MAP[normalizedKey as keyof typeof SCHEDULE_IMPORT_COLUMN_MAP];
              mapped[englishKey ?? normalizedKey] = value as never;
            }
            return mapped;
          })
          .filter((row): row is ScheduleImportDraftRowInput =>
            Boolean(row.sourceRowKey && row.termName && row.className && row.courseTitle && row.teacherName),
          );

        const importableRows = rows.filter((row) => !isScheduleImportTemplateSampleRow(row));

        setParsedRows(importableRows.length);

        if (rows.length > 0 && importableRows.length === 0) {
          setStage("error");
          setErrorMessage("只识别到模板示例行，请先删除示例数据或替换为真实课表后再导入。");
          return;
        }

        if (importableRows.length === 0) {
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
          formData.append("rows", JSON.stringify(importableRows));

          const result = await draftScheduleImportAction(formData);

          if (!result.ok) {
            setStage("error");
            setBlockingFeedback(null);
            setErrorMessage(result.message);
            return;
          }

          const batch = result.data as Partial<ScheduleImportBatchDTO> & { id?: string };
          const blockingRows = Array.isArray(batch.rows) ? batch.rows.filter((row) => blockingStatuses.has(row.status)) : [];

          if (blockingRows.length > 0) {
            setStage("error");
            setErrorMessage(null);
            setBlockingFeedback(buildBlockingFeedback(blockingRows));
            return;
          }

          const approved = await approveScheduleImportAction({
            batchId: batch.id ?? "",
            approvedRowIds: [],
            rejectedRowIds: [],
          });

          if (!approved.ok) {
            setStage("error");
            setBlockingFeedback(null);
            setErrorMessage(approved.message);
            return;
          }

          setStage("done");

          setTimeout(() => {
            closeModal();
            success("课表已导入成功", {
              description: "当前学期课表已回到主视图展示。",
            });
            router.push("/teacher/schedule");
            router.refresh();
          }, 1200);
        });
      },
      error: (err) => {
        setStage("error");
        setBlockingFeedback(null);
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
        className={getNativeDialogClassName(
          "lg",
          "min-w-[20rem] open:animate-in open:fade-in-0 open:zoom-in-95",
        )}
        onClick={handleDialogBackdropClose}
      >
        <div className="w-full p-6">
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

            {blockingFeedback && (
              <div className="mt-2 w-full rounded-xl bg-error-container/60 p-4 text-left text-sm text-error">
                <p className="font-medium">{blockingFeedback.summary}</p>
                <div className="mt-3 space-y-3">
                  {blockingFeedback.groups.map((group) => (
                    <section key={group.key} aria-label={group.title}>
                      <p className="font-medium text-error">{group.title}（{group.items.length}）</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-error/90">
                        {group.items.map((item) => (
                          <li key={`${group.key}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
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
                {stage === "submitting" && `已解析 ${parsedRows} 行，正在写入主课表…`}
                {stage === "done" && `已完成导入并写入主课表，共 ${parsedRows} 行`}
              </div>
            )}

            {stage === "error" && (
              <Button
                onClick={() => {
                  setStage("idle");
                  setErrorMessage(null);
                  setBlockingFeedback(null);
                }}
                variant="secondary"
                className="w-full"
              >
                重新选择文件
              </Button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
