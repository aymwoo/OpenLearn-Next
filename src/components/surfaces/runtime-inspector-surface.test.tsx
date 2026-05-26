import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as runtimeInspectorDto from "@/lib/dto/runtime-inspector";

describe("runtime inspector surface", () => {
  const source = readFileSync("src/components/surfaces/runtime-inspector-surface.tsx", "utf8");
  const pageSource = readFileSync("src/app/settings/labs/runtime-inspector/page.tsx", "utf8");

  it("renders an independent runtime inspector page instead of embedding into classroom", () => {
    expect(pageSource).toContain("RuntimeInspectorSurface");
    expect(pageSource).toContain("getRuntimeInspectorDTO");
    expect(pageSource).not.toContain("/classroom");
  });

  it("keeps the first screen as a single unified timeline instead of tabs", () => {
    expect(source).toContain("Unified timeline");
    expect(source).toContain("单条时间线");
    expect(source).toContain("inspector.timeline.map");
    expect(source).toContain("不分 tabs");
    expect(source).not.toContain("Tabs");
  });

  it("shows runtime-session anchored health and trace lanes together", () => {
    expect(source).toContain("runtime session:");
    expect(source).toContain("Lifecycle");
    expect(source).toContain("Governance");
    expect(source).toContain("Transport");
    expect(source).toContain("Consumer");
    expect(source).toContain("transportTopology");
    expect(source).toContain("receivedVia");
  });

  it("reframes the hero as the current proof session and review path", () => {
    expect(source).toContain("当前 proof 会话");
    expect(source).toContain("查看本次运行轨迹");
    expect(source).toContain("沿时间线排查治理、传输与消费状态");
  });

  it("keeps inspector review posture anchored to runtimeSessionId and transport trace drill-down", () => {
    expect(pageSource).toContain("runtimeSessionId?: string");
    expect(pageSource).toContain("runtimeSessionId: resolvedSearchParams.runtimeSessionId");
    expect(source).toContain("沿时间线排查治理、传输与消费状态");
  });

  it("normalizes degraded runtime posture into the shared three-part honesty contract", () => {
    expect("toRuntimeInspectorHonestyCard" in runtimeInspectorDto).toBe(true);

    const honesty = (runtimeInspectorDto as Record<string, unknown>).toRuntimeInspectorHonestyCard as
      | ((input: Record<string, unknown>) => {
          sections: Array<{ id: string; label: string; content: string }>;
        } | null)
      | undefined;

    const normalized = honesty?.({
      lifecycleState: "active",
      governanceDecision: "allowed",
      transportAttemptStatus: "failed",
      consumerTraceStatus: "emitted",
      transportTopology: "degraded_local_fallback",
      degraded: true,
      degradedReason: "redis fanout unavailable",
      lastHealthyAt: null,
      allowedCount: 1,
      deniedCount: 0,
      deliveredCount: 1,
      failedCount: 1,
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.sections.map((section) => section.id)).toEqual([
      "trustBoundary",
      "impactScope",
      "nextStep",
    ]);
    expect(normalized?.sections[0]?.content).toContain("仍可信什么：");
    expect(normalized?.sections[0]?.content).toContain("已不可信什么：");
    expect(normalized?.sections[1]?.label).toBe("影响范围");
    expect(normalized?.sections[2]?.label).toBe("推荐下一步");
  });
});
