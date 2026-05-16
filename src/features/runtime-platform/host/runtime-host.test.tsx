import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const hostClientSource = readFileSync("src/features/runtime-platform/host/runtime-host-client.tsx", "utf8");
const pilotSource = readFileSync("src/app/runtime/html-courseware/pilot/page.tsx", "utf8");

describe("RuntimeHost pilot wiring", () => {
  it("records runtime-ready through the shared host boundary", () => {
    expect(hostClientSource).toContain("recordRuntimeReadyAction");
    expect(hostClientSource).toContain('message.kind === "runtime-ready"');
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

  it("keeps the local html pilot on browser postMessage bridge only", () => {
    expect(pilotSource).toContain("window.parent.postMessage");
    expect(pilotSource).toContain("runtime-submit");
    expect(pilotSource).toContain("runtime-save");
    expect(pilotSource).not.toContain("db.");
    expect(pilotSource).not.toContain("@/lib/dal");
    expect(pilotSource).not.toContain("fetch('/api/");
    expect(pilotSource).not.toContain('fetch("/api/');
  });
});
