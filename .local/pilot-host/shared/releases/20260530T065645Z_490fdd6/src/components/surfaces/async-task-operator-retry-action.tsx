"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { retryAsyncTaskForOperatorAction } from "@/actions/async-task-operator-actions";
import { Button } from "@/components/ui/button";
import type { AsyncTaskOperatorDetailDTO } from "@/lib/dto/async-task-operator";

export function AsyncTaskOperatorRetryAction({
  taskId,
  retryEligibility,
}: {
  taskId: string;
  retryEligibility: AsyncTaskOperatorDetailDTO["retryEligibility"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!retryEligibility.canRetry) {
    return (
      <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-6 text-on-surface-variant">
        {retryEligibility.reason ?? "当前任务暂时不能重试。"}
      </div>
    );
  }

  return (
    <div className="relative rounded-[1.5rem] bg-surface-container-low p-4">
      <Button
        variant="secondary"
        className="min-h-10 px-4 text-sm shadow-none"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
      >
        重试此任务
      </Button>

      {message ? (
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          {message} 新 attempt 已创建，时间线与 attempts 会继续追加到当前任务。
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm leading-6 text-[#b31b25]">{error}</p>
      ) : null}

      {open ? (
        <div className="mt-4 rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient">
          <p className="text-sm leading-6 text-on-surface">
            这会在当前任务下追加一次新的 attempt
          </p>
          <p className="mt-2 text-sm leading-6 text-on-surface">
            系统会记录本次 recovery event
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              className="min-h-10 px-4 text-sm"
              disabled={pending}
              onClick={() => {
                setPending(true);
                setError(null);
                startTransition(() => {
                  void retryAsyncTaskForOperatorAction({ taskId }).then((result) => {
                    setPending(false);
                    if (result.ok) {
                      setMessage("已加入恢复流程，正在等待 worker 重新接手。");
                      setOpen(false);
                      router.refresh();
                      return;
                    }

                    setError(result.message);
                  });
                });
              }}
            >
              {pending ? "提交中" : retryEligibility.ctaLabel}
            </Button>
            <Button
              variant="tertiary"
              className="min-h-10 px-4 text-sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
