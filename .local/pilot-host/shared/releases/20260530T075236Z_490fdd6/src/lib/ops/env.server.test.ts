import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ServerEnvSchema, getServerEnv } from "@/lib/ops/env.server";

function createValidEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    HOSTNAME: "0.0.0.0",
    PORT: "3000",
    DB_FILE_NAME: "file:local.db",
    AUTH_SECRET: "auth-secret-placeholder",
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: "server-actions-encryption-key-placeholder",
    ASYNC_TASKS_ENABLED: "true",
    BULLMQ_REDIS_URL: "redis://127.0.0.1:6379",
    BULLMQ_PREFIX: "openlearn:async-tasks",
    REDIS_FANOUT_ENABLED: "false",
    REDIS_URL: "redis://127.0.0.1:6379",
    RUNTIME_INSTANCE_ID: "runtime-1",
    WORKER_INSTANCE_ID: "worker-1",
    OPENLEARN_DEPLOY_ENV: "pilot-single-school",
    OPENLEARN_SHARED_ROOT: "./shared",
    OPENLEARN_CURRENT_ROOT: "./current",
    OPENLEARN_RUNTIME_ASSETS_ROOT: "./runtime-assets",
    OPENLEARN_RELEASE_MANIFESTS_DIR: "./ops/releases/manifests",
    OPENLEARN_HEALTHCHECK_BASE_URL: "http://127.0.0.1:3000",
    ...overrides,
  };
}

describe("env.server", () => {
  it("missing required env fails fast", () => {
    const requiredKeys = [
      "DB_FILE_NAME",
      "AUTH_SECRET",
      "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
    ] as const;

    for (const key of requiredKeys) {
      const env = createValidEnv({ [key]: undefined });
      const result = ServerEnvSchema.safeParse(env);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === key)).toBe(true);
      }
    }
  });

  it("bullmq redis is blocking", () => {
    const missingBullmqRedis = ServerEnvSchema.safeParse(
      createValidEnv({
        ASYNC_TASKS_ENABLED: "true",
        BULLMQ_REDIS_URL: undefined,
        REDIS_URL: "redis://127.0.0.1:6379",
      }),
    );

    expect(missingBullmqRedis.success).toBe(false);
    if (!missingBullmqRedis.success) {
      expect(
        missingBullmqRedis.error.issues.some((issue) => issue.path[0] === "BULLMQ_REDIS_URL"),
      ).toBe(true);
    }

    const parsed = getServerEnv(
      createValidEnv({
        BULLMQ_REDIS_URL: "redis://127.0.0.1:6379",
        REDIS_URL: "redis://127.0.0.1:6379",
      }),
    );

    expect(parsed.bullmq.workerReady).toBe(true);
    expect(parsed.bullmq.isBlocking).toBe(true);
    expect(parsed.bullmq.redisUrl).toBe("redis://127.0.0.1:6379");
    expect(parsed.fanout.redisUrl).toBe("redis://127.0.0.1:6379");
  });

  it("fanout redis stays optional", () => {
    const disabledFanout = getServerEnv(
      createValidEnv({
        REDIS_FANOUT_ENABLED: "false",
        REDIS_URL: undefined,
      }),
    );

    expect(disabledFanout.fanout.isBlocking).toBe(false);
    expect(disabledFanout.fanout.deployAllowsRedis).toBe(false);
    expect(disabledFanout.fanout.posture).toBe("optional-disabled");

    const missingFanoutRedis = getServerEnv(
      createValidEnv({
        REDIS_FANOUT_ENABLED: "true",
        REDIS_URL: undefined,
        BULLMQ_REDIS_URL: "redis://127.0.0.1:6379",
      }),
    );

    expect(missingFanoutRedis.fanout.isBlocking).toBe(false);
    expect(missingFanoutRedis.fanout.deployAllowsRedis).toBe(false);
    expect(missingFanoutRedis.fanout.redisConfigured).toBe(false);
    expect(missingFanoutRedis.fanout.posture).toBe("optional-disabled");
  });

  it("keeps .env.example aligned with the required contract", () => {
    const templatePath = path.join(process.cwd(), ".env.example");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain("OPENLEARN_DEPLOY_ENV=pilot-single-school");
    expect(template).toContain("DB_FILE_NAME=file:local.db");
    expect(template).toContain("BULLMQ_REDIS_URL=redis://127.0.0.1:6379");
    expect(template).toContain("REDIS_URL=redis://127.0.0.1:6379");
    expect(template).toContain("OPENLEARN_RUNTIME_ASSETS_ROOT=./runtime-assets");
    expect(template).toContain("OPENLEARN_RELEASE_MANIFESTS_DIR=./ops/releases/manifests");
  });
});
