import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

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
  });

  it("reframes the hero as the current proof session and review path", () => {
    expect(source).toContain("当前 proof 会话");
    expect(source).toContain("查看本次运行轨迹");
    expect(source).toContain("沿时间线排查治理、传输与消费状态");
  });
});
