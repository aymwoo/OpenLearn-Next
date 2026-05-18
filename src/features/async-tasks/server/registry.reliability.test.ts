import { describe, expect, it } from "vitest";

import { platformHealthCheckTaskDefinition } from "./registry";

describe("async task registry reliability metadata", () => {
  it("declares retry, backoff, dead-letter, and idempotency posture explicitly", () => {
    expect(platformHealthCheckTaskDefinition.reliability).toMatchObject({
      queueName: "platform-health",
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      deadLetter: {
        terminalStatus: "failed",
      },
      idempotency: {
        strategy: "task_id",
      },
    });
  });
});
