import { z } from "zod";

const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "Required environment variable is missing");

const OptionalTrimmedStringSchema = z
  .string()
  .trim()
  .min(1)
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  });

const BooleanFlagSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const RawServerEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOSTNAME: NonEmptyStringSchema.default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),
    DB_FILE_NAME: NonEmptyStringSchema,
    AUTH_SECRET: NonEmptyStringSchema,
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: NonEmptyStringSchema,
    ASYNC_TASKS_ENABLED: BooleanFlagSchema,
    BULLMQ_REDIS_URL: OptionalTrimmedStringSchema,
    BULLMQ_PREFIX: NonEmptyStringSchema.default("openlearn:async-tasks"),
    REDIS_FANOUT_ENABLED: BooleanFlagSchema,
    REDIS_URL: OptionalTrimmedStringSchema,
    RUNTIME_INSTANCE_ID: OptionalTrimmedStringSchema,
    WORKER_INSTANCE_ID: OptionalTrimmedStringSchema,
    OPENLEARN_DEPLOY_ENV: NonEmptyStringSchema,
    OPENLEARN_SHARED_ROOT: NonEmptyStringSchema,
    OPENLEARN_CURRENT_ROOT: NonEmptyStringSchema,
    OPENLEARN_RUNTIME_ASSETS_ROOT: NonEmptyStringSchema,
    OPENLEARN_RELEASE_MANIFESTS_DIR: NonEmptyStringSchema,
    OPENLEARN_HEALTHCHECK_BASE_URL: z.string().trim().url(),
  })
  .superRefine((env, ctx) => {
    if (env.ASYNC_TASKS_ENABLED && !env.BULLMQ_REDIS_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["BULLMQ_REDIS_URL"],
        message:
          "BULLMQ_REDIS_URL is required when ASYNC_TASKS_ENABLED=true because worker readiness is a blocking dependency.",
      });
    }
  });

export const ServerEnvSchema = RawServerEnvSchema.transform((env) => {
  const bullmqRedisConfigured = Boolean(env.BULLMQ_REDIS_URL);
  const fanoutRedisConfigured = Boolean(env.REDIS_URL);

  return {
    ...env,
    bullmq: {
      asyncTasksEnabled: env.ASYNC_TASKS_ENABLED,
      redisConfigured: bullmqRedisConfigured,
      redisUrl: env.BULLMQ_REDIS_URL ?? null,
      prefix: env.BULLMQ_PREFIX,
      workerReady: env.ASYNC_TASKS_ENABLED && bullmqRedisConfigured,
      isBlocking: true,
      posture: env.ASYNC_TASKS_ENABLED ? "blocking-required" : "disabled",
    },
    fanout: {
      fanoutEnabled: env.REDIS_FANOUT_ENABLED,
      redisConfigured: fanoutRedisConfigured,
      redisUrl: env.REDIS_URL ?? null,
      deployAllowsRedis: env.REDIS_FANOUT_ENABLED && fanoutRedisConfigured,
      isBlocking: false,
      posture:
        env.REDIS_FANOUT_ENABLED && fanoutRedisConfigured
          ? "optional-enabled"
          : "optional-disabled",
    },
  };
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export function getServerEnv(input: Record<string, string | undefined> = process.env) {
  return ServerEnvSchema.parse(input);
}
