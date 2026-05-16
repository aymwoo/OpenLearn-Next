"use client";

import { useEffect, useRef, useState } from "react";

import {
  bootstrapRuntimeSessionAction,
  recordRuntimeReadyAction,
  recordRuntimeInteractionAction,
  saveRuntimeStateAction,
  submitRuntimeStateAction,
} from "@/actions/classroom-actions";
import type { RuntimeDescriptor } from "@/features/runtime-platform/contracts/descriptors";
import type { RuntimeBootstrapDTO } from "@/features/runtime-platform/classroom/runtime-session-contracts";
import type { TeachingBridgeResultEnvelope } from "@/features/runtime-platform/contracts/bridge";

import {
  createRuntimeBootstrapMessage,
  createRuntimeCapabilityContext,
  createRuntimeRequestEnvelope,
  createRuntimeSnapshotUpdateMessage,
  createRuntimeBridgeMessageId,
  isRuntimeBridgeMessageForInstance,
  postRuntimeBridgeMessage,
  type RuntimeHostSurface,
} from "./runtime-host-bridge";
import { RuntimeHostFrame, type RuntimeHostFrameStatus } from "./runtime-host-frame";

type RuntimeActorScope = "teacher" | "student";

type RuntimeHostClientProps = {
  descriptor: RuntimeDescriptor;
  surface: RuntimeHostSurface;
  actorScope: RuntimeActorScope;
  actorId?: string | null;
  schoolId?: string | null;
  lessonId: string;
  stepId: string;
  stepTitle: string;
  publishedVersionId?: string | null;
  classroomSessionId?: string | null;
  snapshotPayload?: Record<string, unknown> | null;
  latestRuntimeStateSummary?: Record<string, unknown>;
  note?: string | null;
};

function getSurfaceTitle(surface: RuntimeHostSurface) {
  if (surface === "teacher-preview") return "草稿 Runtime 预览";
  if (surface === "student-player") return "当前学习 Runtime";
  return "课堂 Runtime 主舞台";
}

function getInitialStatusCopy(surface: RuntimeHostSurface) {
  if (surface === "teacher-preview") {
    return "正在装载草稿 runtime 预览。";
  }
  return "正在建立 runtime 宿主与课堂边界连接。";
}

function applyRuntimeFailureState(input: {
  failedKind: "runtime-save" | "runtime-submit" | "other";
  setStatus: (status: RuntimeHostFrameStatus) => void;
  setStatusCopy: (copy: string) => void;
}) {
  if (input.failedKind === "runtime-save") {
    input.setStatus("save-failed");
    input.setStatusCopy("当前状态暂未保存成功，请直接重试保存，系统会保留你刚才填写的内容。");
    return;
  }

  if (input.failedKind === "runtime-submit") {
    input.setStatus("submit-failed");
    input.setStatusCopy("本次互动结果暂未提交成功，请重试当前提交；老师会先在课堂面板看到异常状态。");
    return;
  }

  input.setStatus("error");
  input.setStatusCopy("runtime 请求执行失败。");
}

export function RuntimeHostClient({
  descriptor,
  surface,
  actorScope,
  actorId,
  schoolId,
  lessonId,
  stepId,
  stepTitle,
  publishedVersionId,
  classroomSessionId,
  snapshotPayload,
  latestRuntimeStateSummary,
  note,
}: RuntimeHostClientProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const runtimeInstanceIdRef = useRef(`runtime-host-${createRuntimeBridgeMessageId()}`);
  const actorIdentity = actorId ?? `runtime-host-${actorScope}`;
  const [frameReady, setFrameReady] = useState(false);
  const [frameHeight, setFrameHeight] = useState(560);
  const [status, setStatus] = useState<RuntimeHostFrameStatus>("loading");
  const [statusCopy, setStatusCopy] = useState(getInitialStatusCopy(surface));
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<RuntimeBootstrapDTO | null>(null);

  useEffect(() => {
    if (!classroomSessionId || !publishedVersionId) {
      if (surface === "teacher-preview") {
        setStatus("snapshot-fallback");
        setStatusCopy("草稿预览不会读取学生进度或课堂运行态。宿主仅下发当前草稿内容。");
      } else {
        setStatus("snapshot-fallback");
        setStatusCopy("当前 runtime 尚未绑定 live classroom session，宿主先保留静态快照。");
      }
      return;
    }

    let cancelled = false;

    const capabilityContext = createRuntimeCapabilityContext({
      actorId: actorIdentity,
      actorScope,
      grantedCapabilities: [
        "runtime:ready",
        "runtime:event:emit",
        "runtime:state:save",
        "runtime:submission:create",
        "runtime:host-action:request",
      ],
      schoolId: schoolId ?? undefined,
      sessionId: classroomSessionId,
    });

    void bootstrapRuntimeSessionAction(
      createRuntimeRequestEnvelope({
        kind: "runtime-bootstrap",
        runtimeInstanceId: runtimeInstanceIdRef.current,
        capabilityContext,
        payload: {
          classroomSessionId,
          publishedVersionId,
          lessonId,
          stepId,
          runtimeVersion: descriptor.runtimeVersion,
          sessionId: classroomSessionId,
          resumeFromLatest: true,
        },
      }),
    ).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setStatus("error");
        setStatusCopy("runtime bootstrap 失败，已回退到宿主说明态。");
        setErrorCopy(result.message);
        return;
      }

      setBootstrap(result.data as RuntimeBootstrapDTO);
      setStatus(frameReady ? "ready" : "loading");
      setStatusCopy(frameReady ? "runtime bootstrap 已准备完成。" : "runtime bootstrap 已返回，等待 iframe ready。");
    }).catch((error) => {
      if (cancelled) {
        return;
      }

      setStatus("error");
      setStatusCopy("runtime bootstrap 失败，已回退到宿主说明态。");
      setErrorCopy(error instanceof Error ? error.message : "RUNTIME_BOOTSTRAP_FAILED");
    });

    return () => {
      cancelled = true;
    };
  }, [actorIdentity, actorScope, classroomSessionId, descriptor.runtimeVersion, frameReady, lessonId, publishedVersionId, schoolId, stepId, surface]);

  useEffect(() => {
    if (!frameReady || !iframeRef.current?.contentWindow) {
      return;
    }

    postRuntimeBridgeMessage(
      iframeRef.current.contentWindow,
      createRuntimeBootstrapMessage({
        runtimeInstanceId: runtimeInstanceIdRef.current,
        surface,
        bootstrap,
        preview: {
          title: stepTitle,
          note: note ?? undefined,
        },
      }),
    );

    if (snapshotPayload) {
      postRuntimeBridgeMessage(
        iframeRef.current.contentWindow,
        createRuntimeSnapshotUpdateMessage({
          runtimeInstanceId: runtimeInstanceIdRef.current,
          snapshot: {
            ...snapshotPayload,
            latestRuntimeStateSummary: latestRuntimeStateSummary ?? {},
          },
        }),
      );
    }

      if (status === "loading" || status === "ready") {
        setStatus("ready");
        setStatusCopy("runtime host 已连接，可继续互动、保存与提交。");
        setErrorCopy(null);
      }
  }, [bootstrap, frameReady, latestRuntimeStateSummary, note, snapshotPayload, status, stepTitle, surface]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const message = isRuntimeBridgeMessageForInstance(event.data, runtimeInstanceIdRef.current);
      if (!message) {
        return;
      }

      if (message.kind === "runtime-frame-ready") {
        setFrameReady(true);
        setStatusCopy(bootstrap ? "runtime iframe 已 ready。" : "runtime iframe 已 ready，等待宿主 bootstrap。");
        return;
      }

      if (message.kind === "runtime-height-change") {
        setFrameHeight(Math.max(420, Math.min(1080, Math.round(message.height))));
        return;
      }

      if (!classroomSessionId || !publishedVersionId) {
        setStatus("snapshot-fallback");
        setStatusCopy("当前 surface 为只读预览，runtime 互动不会写入课堂真相源。");
        return;
      }

      const action =
        message.kind === "runtime-ready"
          ? recordRuntimeReadyAction
          : message.kind === "runtime-interaction"
          ? recordRuntimeInteractionAction
          : message.kind === "runtime-save"
            ? saveRuntimeStateAction
            : message.kind === "runtime-submit"
              ? submitRuntimeStateAction
              : null;

      if (!action) {
        return;
      }

      void action(message).then((result) => {
        if (!iframeRef.current?.contentWindow) {
          return;
        }

        if (!result.ok) {
          applyRuntimeFailureState({
            failedKind: message.kind === "runtime-submit" ? "runtime-submit" : message.kind === "runtime-save" ? "runtime-save" : "other",
            setStatus,
            setStatusCopy,
          });
          setErrorCopy(result.message);
          return;
        }

        setErrorCopy(null);

        if (message.kind === "runtime-save") {
          setStatus("save-success");
          setStatusCopy("runtime state 已通过 trusted host boundary 保存。");
        }

        if (message.kind === "runtime-submit") {
          setStatus("submit-success");
          setStatusCopy("runtime submit 已通过 trusted host boundary 提交。");
        }

        if (message.kind === "runtime-interaction") {
          setStatus("ready");
          setStatusCopy("runtime interaction 已记录。");
        }

        if (message.kind === "runtime-ready") {
          setStatus("ready");
          setStatusCopy("runtime ready 已记录，宿主已进入可交互状态。");
        }

        postRuntimeBridgeMessage(
          iframeRef.current.contentWindow,
          {
            ...(result.data as TeachingBridgeResultEnvelope),
            channel: "openlearn-runtime-host-v1",
          },
        );
      }).catch((error) => {
        applyRuntimeFailureState({
          failedKind: message.kind === "runtime-submit" ? "runtime-submit" : message.kind === "runtime-save" ? "runtime-save" : "other",
          setStatus,
          setStatusCopy,
        });
        setErrorCopy(error instanceof Error ? error.message : "RUNTIME_HOST_REQUEST_FAILED");
      });
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [bootstrap, classroomSessionId, publishedVersionId]);

  return (
    <RuntimeHostFrame
      descriptor={descriptor}
      iframeRef={iframeRef}
      src={descriptor.entry.bootstrap}
      title={getSurfaceTitle(surface)}
      subtitle={note ?? `${stepTitle} 通过共享 runtime host 渲染，不额外引入 route-specific iframe 逻辑。`}
      frameHeight={frameHeight}
      status={status}
      statusCopy={statusCopy}
      errorCopy={errorCopy}
    />
  );
}
