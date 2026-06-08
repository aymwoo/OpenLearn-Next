import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("classroom fanout", () => {
  it("routes quiz.answer.received through runtime subchannel and session topic helper", () => {
    const topicSource = readFileSync(
      "src/features/runtime-platform/seams/transport/redis-fanout-topics.ts",
      "utf8",
    );

    expect(topicSource).toContain('input.kind.startsWith("quiz.")');
    expect(topicSource).toContain("export function quizAnswerReceivedTopic");
  });

  it("keeps fail-open local fallback when redis publish fails", () => {
    const managerSource = readFileSync(
      "src/features/runtime-platform/seams/transport/redis-fanout-manager.ts",
      "utf8",
    );

    expect(managerSource).toContain("classroomWebSocketConnectionRegistry.broadcast(");
    expect(managerSource).toContain("throw new RedisFanoutDeliveryError");
  });
});
