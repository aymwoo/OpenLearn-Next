import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("live-view", () => {
  it("keeps live-answer surface zero-write and websocket-driven", () => {
    const surfaceSource = readFileSync(
      "src/components/classroom/live-answer-dashboard-surface.tsx",
      "utf8",
    );
    const storeSource = readFileSync(
      "src/components/classroom/live-answer-dashboard-store.ts",
      "utf8",
    );

    expect(surfaceSource).toContain("只读聚合作答流，不触发任何写操作");
    expect(surfaceSource).not.toMatch(/update[A-Z]|delete[A-Z]|grade[A-Z]/);
    expect(storeSource).toContain("pushEnvelope");
    expect(storeSource).toContain("latestByQuestionStudent");
  });

  it("switches classroom websocket client to consume quiz.answer.received as runtime updates", () => {
    const clientSource = readFileSync(
      "src/components/classroom/classroom-ws-client.ts",
      "utf8",
    );

    expect(clientSource).toContain("parsed.envelope?.kind === 'quiz.answer.received'");
  });
});
