import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { processPlatformHealthcheckJob } from "./platform-healthcheck";

const processorSource = readFileSync(
  "src/features/async-tasks/worker/processors/platform-healthcheck.ts",
  "utf8",
);
const workerRegistrySource = readFileSync(
  "src/features/async-tasks/worker/registry.ts",
  "utf8",
);

describe("platform healthcheck processor", () => {
  it("updates structured progress and returns typed result without direct DAL writes", async () => {
    const updateProgress = vi.fn(async () => undefined);

    const result = await processPlatformHealthcheckJob({
      id: "job_1",
      name: "platform.healthcheck",
      data: {
        requestedBy: "developer",
        reason: "phase40 gate",
      },
      updateProgress,
    });

    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "running",
        messageKey: "asyncTasks.progress.running",
        detail: expect.objectContaining({
          requestedBy: "developer",
        }),
      }),
    );
    expect(result).toEqual({
      checksPassed: 1,
      checksFailed: 0,
    });
  });

  it("is registered through the worker registry", () => {
    expect(workerRegistrySource).toContain("platform.healthcheck");
    expect(workerRegistrySource).toContain("processPlatformHealthcheckJob");
  });

  it("keeps processor discipline away from direct db writes", () => {
    expect(processorSource).not.toContain("@/db");
    expect(processorSource).not.toContain("drizzle-orm");
  });
});
