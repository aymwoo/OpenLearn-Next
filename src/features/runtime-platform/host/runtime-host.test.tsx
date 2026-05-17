import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const hostClientSource = readFileSync("src/features/runtime-platform/host/runtime-host-client.tsx", "utf8");
const hostFrameSource = readFileSync("src/features/runtime-platform/host/runtime-host-frame.tsx", "utf8");
const pilotSource = readFileSync("src/app/runtime/html-courseware/pilot/page.tsx", "utf8");

describe("RuntimeHost pilot wiring", () => {
  it("records runtime-ready through the shared host boundary", () => {
    expect(hostClientSource).toContain("recordRuntimeReadyAction");
    expect(hostClientSource).toContain('message.kind === "runtime-ready"');
  });

  it("accepts the iframe ready handshake before the runtime instance id is synchronized", () => {
    expect(hostClientSource).toContain("useLayoutEffect(() => {");
    expect(hostClientSource).toContain("const parsedMessage = parseRuntimeBridgeMessage(event.data);");
    expect(hostClientSource).toContain('if (parsedMessage.kind === "runtime-frame-ready")');
    expect(hostClientSource).toContain("const message = isRuntimeBridgeMessageForInstance(parsedMessage, runtimeInstanceIdRef.current);");
    expect(hostClientSource.indexOf("useLayoutEffect(() => {")).toBeLessThan(
      hostClientSource.indexOf("void bootstrapRuntimeSessionAction("),
    );
    expect(pilotSource).toContain('runtimeInstanceId: "runtime-pilot-pending"');
  });

  it("keeps strict instance filtering for non-ready runtime bridge messages", () => {
    expect(hostClientSource).toContain('if (parsedMessage.kind === "runtime-frame-ready")');
    expect(hostClientSource).toContain("const message = isRuntimeBridgeMessageForInstance(parsedMessage, runtimeInstanceIdRef.current);");
    expect(hostClientSource).toContain('message.kind === "runtime-ready"');
    expect(hostClientSource).toContain('message.kind === "runtime-interaction"');
    expect(hostClientSource).toContain('message.kind === "runtime-save"');
    expect(hostClientSource).toContain('message.kind === "runtime-submit"');
  });

  it("keeps the pilot placeholder handshake visible until bootstrap delivers the final runtime instance id", () => {
    expect(pilotSource).toContain('kind: "runtime-frame-ready"');
    expect(pilotSource).toContain('runtimeInstanceId: "runtime-pilot-pending"');
    expect(pilotSource).toContain("setRuntimeInstanceId(message.runtimeInstanceId);");
    expect(pilotSource).toContain('runtimeInstanceId: runtimeInstanceId ?? "runtime-pilot-pending"');
  });

  it("distinguishes submit terminal state from retryable failure states", () => {
    expect(hostClientSource).toContain('setStatus("submit-success")');
    expect(hostClientSource).toContain('setStatus("save-failed")');
    expect(hostClientSource).toContain('setStatus("submit-failed")');
  });

  it("locks the html pilot UI after submit success and keeps a structured summary visible", () => {
    expect(pilotSource).toContain("已提交本次互动结果");
    expect(pilotSource).toContain("本次提交摘要");
    expect(pilotSource).toContain("const isTerminalSubmitState");
    expect(pilotSource).toContain("disabled={isTerminalSubmitState}");
  });

  it("keeps submit success and retry failure copy on the shared host boundary", () => {
    expect(hostClientSource).toContain("当前状态暂未保存成功，请直接重试保存");
    expect(hostClientSource).toContain("本次互动结果暂未提交成功，请重试当前提交");
    expect(hostClientSource).toContain("runtime submit 已通过 trusted host boundary 提交");
  });

  it("keeps the local html pilot on browser postMessage bridge only", () => {
    expect(pilotSource).toContain("window.parent.postMessage");
    expect(pilotSource).toContain("runtime-submit");
    expect(pilotSource).toContain("runtime-save");
    expect(pilotSource).not.toContain("db.");
    expect(pilotSource).not.toContain("@/lib/dal");
    expect(pilotSource).not.toContain("fetch('/api/");
    expect(pilotSource).not.toContain('fetch("/api/');
  });

  it("keeps the runtime iframe on the minimal same-origin sandbox posture required by the pilot route", () => {
    expect(hostFrameSource).toContain('sandbox="allow-scripts allow-forms allow-same-origin"');
    expect(hostFrameSource).not.toContain("allow-top-navigation");
    expect(hostFrameSource).not.toContain("allow-popups");
    expect(hostFrameSource).not.toContain("allow-downloads");
  });
});
