import type { RefObject } from "react";

import { AlertCircle, CheckCircle2, LoaderCircle, MonitorPlay } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RuntimeDescriptor } from "@/features/runtime-platform/contracts/descriptors";

type RuntimeHostFrameStatus =
  | "loading"
  | "ready"
  | "save-success"
  | "save-failed"
  | "submit-success"
  | "submit-failed"
  | "snapshot-fallback"
  | "error";

type RuntimeHostFrameProps = {
  descriptor: RuntimeDescriptor;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  src: string;
  title: string;
  subtitle: string;
  frameHeight: number;
  status: RuntimeHostFrameStatus;
  statusCopy: string;
  errorCopy?: string | null;
};

export function RuntimeHostFrame({
  descriptor,
  iframeRef,
  src,
  title,
  subtitle,
  frameHeight,
  status,
  statusCopy,
  errorCopy,
}: RuntimeHostFrameProps) {
  const isError = status === "error" || status === "save-failed" || status === "submit-failed";

  return (
    <Card className="overflow-hidden rounded-[var(--radius-shell)] bg-surface-container-lowest p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Runtime Host</Badge>
            <Badge className="bg-surface-container-low text-on-surface-variant">
              {descriptor.kind}
            </Badge>
          </div>
          <h3 className="mt-3 text-xl font-semibold text-on-surface">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">{subtitle}</p>
        </div>

        <div className="rounded-[1.2rem] bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          <div className="flex items-center gap-2 font-medium text-on-surface">
            <MonitorPlay className="size-4 text-primary" aria-hidden />
            宿主状态
          </div>
          <p className="mt-2">{statusCopy}</p>
          {errorCopy ? <p className="mt-2 text-[#b42318]">{errorCopy}</p> : null}
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] bg-surface-container-low p-3">
        <div className="mb-3 flex items-center gap-2 text-sm text-on-surface-variant">
          {status === "loading" ? (
            <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
          ) : isError ? (
            <AlertCircle className="size-4 text-[#b42318]" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 text-tertiary" aria-hidden />
          )}
          {statusCopy}
        </div>

        <div className="overflow-hidden rounded-[1.25rem] bg-white" style={{ minHeight: frameHeight }}>
          <iframe
            ref={iframeRef}
            title={`${title} runtime`}
            src={src}
            className="block w-full border-0"
            style={{ height: frameHeight }}
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        </div>
      </div>
    </Card>
  );
}

export type { RuntimeHostFrameStatus };
