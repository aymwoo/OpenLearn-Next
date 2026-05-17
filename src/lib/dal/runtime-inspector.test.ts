import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("runtime inspector dal", () => {
  const source = readFileSync("src/lib/dal/runtime-inspector.ts", "utf8");

  it("anchors the read model on runtime session and keeps a single deterministic timeline", () => {
    expect(source).toContain("selectedRuntimeSessionId");
    expect(source).toContain("runtimeStepSessions");
    expect(source).toContain("timeline.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))");
    expect(source).toContain('lane: "runtime"');
    expect(source).toContain('lane: "classroom"');
    expect(source).toContain('lane: "governance"');
    expect(source).toContain('lane: "transport"');
    expect(source).toContain('lane: "consumer"');
  });

  it("keeps role scope explicit for teacher admin and developer", () => {
    expect(source).toContain('role: "developer" as const');
    expect(source).toContain('role: "admin" as const');
    expect(source).toContain('role: "teacher" as const');
    expect(source).toContain("canInspectRuntimeSession");
    expect(source).toContain("schoolIds.includes(session.schoolId)");
    expect(source).toContain("session.actorId === actorId || session.actorScope === \"teacher\"");
  });

  it("derives health only from persisted lifecycle governance transport and consumer facts", () => {
    expect(source).toContain("runtimeLifecycleTransitions");
    expect(source).toContain("governanceAudits");
    expect(source).toContain("transportDeliveryAttempts");
    expect(source).toContain("transportConsumerTraces");
    expect(source).not.toContain("threshold");
    expect(source).not.toContain("anomaly");
    expect(source).not.toContain("prediction");
    expect(source).not.toContain("alert");
  });

  it("keeps runtimeSessionId review focus on the selected proof session timeline", () => {
    expect(source).toContain("input.runtimeSessionId");
    expect(source).toContain("selectedRuntimeSessionId");
    expect(source).toContain("sessionOptions.find((session) => session.runtimeSessionId === selectedSession.id)");
  });
});
