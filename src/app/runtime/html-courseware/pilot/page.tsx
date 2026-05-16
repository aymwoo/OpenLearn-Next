"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createRuntimeBridgeMessageId,
  parseRuntimeBridgeMessage,
  RUNTIME_HOST_BRIDGE_CHANNEL,
} from "@/features/runtime-platform/host";
import type { TeachingBridgeResultEnvelope } from "@/features/runtime-platform/contracts/bridge";

type RuntimeDraftState = {
  observation: string;
  confidence: "low" | "medium" | "high";
  interactionCount: number;
};

type RuntimeBridgeContext = {
  classroomSessionId: string;
  stepId: string;
  lessonId?: string;
  publishedVersionId?: string;
  sessionId?: string;
  runtimeVersion?: string;
};

type TerminalSubmitState = {
  title: string;
  submittedStateLabel: string;
  summary: Record<string, unknown>;
};

const DEFAULT_STATE: RuntimeDraftState = {
  observation: "",
  confidence: "medium",
  interactionCount: 0,
};

function postToHost(message: Record<string, unknown>) {
  window.parent.postMessage(message, "*");
}

export default function HtmlCoursewarePilotPage() {
  const [runtimeInstanceId, setRuntimeInstanceId] = useState<string | null>(null);
  const [bridgeContext, setBridgeContext] = useState<RuntimeBridgeContext | null>(null);
  const [status, setStatus] = useState("等待宿主 bootstrap...");
  const [draft, setDraft] = useState<RuntimeDraftState>(DEFAULT_STATE);
  const [lastFailedAction, setLastFailedAction] = useState<"runtime-save" | "runtime-submit" | null>(null);
  const [terminalSubmitState, setTerminalSubmitState] = useState<TerminalSubmitState | null>(null);

  const summary = useMemo(
    () => ({
      observationLength: draft.observation.trim().length,
      confidence: draft.confidence,
      interactionCount: draft.interactionCount,
    }),
    [draft],
  );

  const isTerminalSubmitState = terminalSubmitState !== null;

  const summaryEntries = useMemo(
    () => Object.entries(terminalSubmitState?.summary ?? {}),
    [terminalSubmitState],
  );

  useEffect(() => {
    function syncHeight() {
      postToHost({
        channel: RUNTIME_HOST_BRIDGE_CHANNEL,
        kind: "runtime-height-change",
        runtimeInstanceId: runtimeInstanceId ?? "runtime-pilot-pending",
        sentAt: new Date().toISOString(),
        height: document.documentElement.scrollHeight,
      });
    }

    function handleMessage(event: MessageEvent) {
      const message = parseRuntimeBridgeMessage(event.data);
      if (!message || message.channel !== RUNTIME_HOST_BRIDGE_CHANNEL) {
        return;
      }

      if (message.kind === "runtime-bootstrap" && "bootstrap" in message) {
        const bootstrap = message.bootstrap;
        const nextContext = {
          classroomSessionId: bootstrap?.classroomSummary.classroomSessionId ?? "preview-classroom-session",
          lessonId: bootstrap?.lessonSummary.lessonId,
          publishedVersionId: bootstrap?.lessonSummary.publishedVersionId,
          stepId: bootstrap?.stepSummary.stepId ?? "preview-step",
          sessionId: bootstrap?.sessionId,
          runtimeVersion: bootstrap?.runtimeVersion,
        } satisfies RuntimeBridgeContext;

        setRuntimeInstanceId(message.runtimeInstanceId);
        setBridgeContext(nextContext);
        setStatus("已收到宿主 bootstrap，准备进入互动。\n");

        const restored = bootstrap?.latestStateSummary?.summary;
        if (restored && typeof restored === "object") {
          setDraft((prev) => ({
            observation: typeof restored.observation === "string" ? restored.observation : prev.observation,
            confidence:
              restored.confidence === "low" || restored.confidence === "medium" || restored.confidence === "high"
                ? restored.confidence
                : prev.confidence,
            interactionCount:
              typeof restored.interactionCount === "number" ? restored.interactionCount : prev.interactionCount,
          }));
        }

        postToHost({
          channel: RUNTIME_HOST_BRIDGE_CHANNEL,
          version: "v2",
          messageId: createRuntimeBridgeMessageId(),
          correlationId: createRuntimeBridgeMessageId(),
          runtimeInstanceId: message.runtimeInstanceId,
          kind: "runtime-ready",
          sentAt: new Date().toISOString(),
          capabilityContext: {
            actorId: "runtime-pilot",
            actorScope: "student",
            grantedCapabilities: ["runtime:ready", "runtime:event:emit", "runtime:state:save", "runtime:submission:create"],
          },
          payload: {
            classroomSessionId: nextContext.classroomSessionId,
            lessonId: nextContext.lessonId,
            publishedVersionId: nextContext.publishedVersionId,
            stepId: nextContext.stepId,
            sessionId: nextContext.sessionId,
            runtimeVersion: nextContext.runtimeVersion,
            readyState: "ready",
            metadata: {
              surface: message.surface,
            },
          },
        });

        syncHeight();
        return;
      }

      if (message.kind === "host-action-result") {
        const envelope = message as TeachingBridgeResultEnvelope;

        if (envelope.requestKind === "runtime-save") {
          if (envelope.status === "ok") {
            setLastFailedAction(null);
            setStatus("当前状态已保存，可继续完善后再提交。\n");
          } else {
            setLastFailedAction("runtime-save");
            setStatus("当前状态暂未保存成功，请直接重试保存，系统会保留你刚才填写的内容。\n");
          }
          return;
        }

        if (envelope.requestKind === "runtime-submit") {
          if (envelope.status === "ok" && envelope.result?.requestKind === "runtime-submit") {
            setLastFailedAction(null);
            setTerminalSubmitState({
              title: envelope.result.proofSummary.title,
              submittedStateLabel: envelope.result.proofSummary.submittedStateLabel,
              summary: envelope.result.proofSummary.summary,
            });
            setStatus("已提交本次互动结果\n你的观察结论和当前把握度已经记录到课堂中，老师现在可以在课堂面板看到你的完成状态。\n");
          } else {
            setLastFailedAction("runtime-submit");
            setStatus("本次互动结果暂未提交成功，请重试当前提交；老师会先在课堂面板看到异常状态。\n");
          }
          return;
        }
      }
    }

    window.addEventListener("message", handleMessage);

    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      kind: "runtime-frame-ready",
      runtimeInstanceId: "runtime-pilot-pending",
      sentAt: new Date().toISOString(),
      metadata: {
        runtime: "html-courseware-pilot",
      },
    });
    syncHeight();

    return () => window.removeEventListener("message", handleMessage);
  }, [runtimeInstanceId]);

  const handleInteract = () => {
    if (!runtimeInstanceId || !bridgeContext || isTerminalSubmitState) {
      return;
    }

    const nextCount = draft.interactionCount + 1;
    setDraft((prev) => ({ ...prev, interactionCount: nextCount }));
    setStatus("已记录一次真实互动，宿主将同步 interaction 事件。");

    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      version: "v2",
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      kind: "runtime-interaction",
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "runtime-pilot",
        actorScope: "student",
        grantedCapabilities: ["runtime:event:emit"],
      },
      payload: {
        classroomSessionId: bridgeContext.classroomSessionId,
        lessonId: bridgeContext.lessonId,
        publishedVersionId: bridgeContext.publishedVersionId,
        sessionId: bridgeContext.sessionId,
        runtimeVersion: bridgeContext.runtimeVersion,
        stepId: bridgeContext.stepId,
        interactionType: "runtime-pilot-input",
        semanticEvent: "runtime-pilot-input",
        payload: {
          interactionCount: nextCount,
        },
      },
    });
  };

  const handleSave = () => {
    if (!runtimeInstanceId || !bridgeContext || isTerminalSubmitState) {
      return;
    }

    setLastFailedAction(null);
    setStatus("已向宿主发送保存请求。\n");
    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      version: "v2",
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      kind: "runtime-save",
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "runtime-pilot",
        actorScope: "student",
        grantedCapabilities: ["runtime:state:save"],
      },
      payload: {
        classroomSessionId: bridgeContext.classroomSessionId,
        lessonId: bridgeContext.lessonId,
        publishedVersionId: bridgeContext.publishedVersionId,
        sessionId: bridgeContext.sessionId,
        runtimeVersion: bridgeContext.runtimeVersion,
        stepId: bridgeContext.stepId,
        stateSchemaVersion: "state-v1",
        state: draft,
        summary: {
          observation: draft.observation,
          confidence: draft.confidence,
          interactionCount: draft.interactionCount,
        },
      },
    });
  };

  const handleSubmit = () => {
    if (!runtimeInstanceId || !bridgeContext || isTerminalSubmitState) {
      return;
    }

    setLastFailedAction(null);
    setStatus("已向宿主发送结构化提交，请由 trusted host boundary 落 truth。\n");
    postToHost({
      channel: RUNTIME_HOST_BRIDGE_CHANNEL,
      version: "v2",
      messageId: createRuntimeBridgeMessageId(),
      correlationId: createRuntimeBridgeMessageId(),
      runtimeInstanceId,
      kind: "runtime-submit",
      sentAt: new Date().toISOString(),
      capabilityContext: {
        actorId: "runtime-pilot",
        actorScope: "student",
        grantedCapabilities: ["runtime:submission:create"],
      },
      payload: {
        classroomSessionId: bridgeContext.classroomSessionId,
        lessonId: bridgeContext.lessonId,
        publishedVersionId: bridgeContext.publishedVersionId,
        sessionId: bridgeContext.sessionId,
        runtimeVersion: bridgeContext.runtimeVersion,
        stepId: bridgeContext.stepId,
        stateSchemaVersion: "state-v1",
        state: {
          ...draft,
          submitted: true,
        },
        summary: {
          observation: draft.observation,
          confidence: draft.confidence,
          interactionCount: draft.interactionCount,
        },
        submittedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 text-[#10233f] sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4 rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(16,35,63,0.12)]">
        <section className="rounded-[24px] bg-[linear-gradient(135deg,#10233f,#1d4ed8)] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">HTML Courseware Pilot</p>
          <h1 className="mt-3 text-3xl font-semibold">共享 Runtime Host 本地互动课件</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
            这个 pilot 只通过 typed browser bridge 与宿主通信，演示 ready、interaction、save、submit 四条链路。
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4 rounded-[24px] bg-[#f8fbff] p-5">
            {isTerminalSubmitState && (
              <div className="rounded-[20px] bg-[#ecfdf3] p-4 text-[#0f5132] shadow-[inset_0_0_0_1px_rgba(15,81,50,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">已提交本次互动结果</p>
                <h2 className="mt-2 text-xl font-semibold">{terminalSubmitState.title}</h2>
                <p className="mt-2 text-sm leading-7">你的观察结论和当前把握度已经记录到课堂中，老师现在可以在课堂面板看到你的完成状态。</p>
              </div>
            )}

            {lastFailedAction && !isTerminalSubmitState && (
              <div className="rounded-[20px] bg-[#fef2f2] p-4 text-[#991b1b] shadow-[inset_0_0_0_1px_rgba(153,27,27,0.08)]">
                <p className="text-sm font-semibold">
                  {lastFailedAction === "runtime-submit"
                    ? "本次互动结果暂未提交成功，请重试当前提交；老师会先在课堂面板看到异常状态。"
                    : "当前状态暂未保存成功，请直接重试保存，系统会保留你刚才填写的内容。"}
                </p>
              </div>
            )}

            <label className="block text-sm font-medium">
              观察结论
              <textarea
                value={draft.observation}
                onChange={(event) => setDraft((prev) => ({ ...prev, observation: event.target.value }))}
                disabled={isTerminalSubmitState}
                className="mt-2 min-h-40 w-full rounded-[20px] border-0 bg-white px-4 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] outline-none"
                placeholder="记录你在互动课件中的发现与结论。"
              />
            </label>

            <label className="block text-sm font-medium">
              当前把握度
              <select
                value={draft.confidence}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    confidence: event.target.value as RuntimeDraftState["confidence"],
                  }))
                }
                disabled={isTerminalSubmitState}
                className="mt-2 h-12 w-full rounded-[18px] border-0 bg-white px-4 shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)] outline-none"
              >
                <option value="low">还需要更多提示</option>
                <option value="medium">基本理解</option>
                <option value="high">可以独立完成</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handleInteract} disabled={isTerminalSubmitState} className="rounded-full bg-[#10233f] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                记录一次互动输入
              </button>
              <button type="button" onClick={handleSave} disabled={isTerminalSubmitState} className="rounded-full bg-[#dbeafe] px-4 py-3 text-sm font-semibold text-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50">
                保存当前状态
              </button>
              <button type="button" onClick={handleSubmit} disabled={isTerminalSubmitState} className="rounded-full bg-[#1d4ed8] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                提交结构化结果
              </button>
            </div>
          </div>

          <aside className="space-y-4 rounded-[24px] bg-[#f8fbff] p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#5b6b82]">Runtime Status</p>
              <p className="mt-3 text-sm leading-7 text-[#10233f] whitespace-pre-line">{status}</p>
            </div>
            <div className="rounded-[20px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(16,35,63,0.08)]">
              <p className="text-sm font-semibold">{isTerminalSubmitState ? "本次提交摘要" : "当前摘要"}</p>
              <dl className="mt-3 space-y-2 text-sm text-[#5b6b82]">
                {isTerminalSubmitState ? (
                  <>
                    <div className="flex items-center justify-between gap-4"><dt>状态</dt><dd>{terminalSubmitState.submittedStateLabel}</dd></div>
                    {summaryEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-4"><dt>{key}</dt><dd>{String(value)}</dd></div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4"><dt>interaction</dt><dd>{summary.interactionCount}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt>confidence</dt><dd>{summary.confidence}</dd></div>
                    <div className="flex items-center justify-between gap-4"><dt>observation</dt><dd>{summary.observationLength} chars</dd></div>
                  </>
                )}
              </dl>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
