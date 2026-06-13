import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Drizzle db
const findFirstPluginRegistrations = vi.fn();
const findFirstMemberships = vi.fn();
const insertGovernanceAudits = vi.fn();

vi.mock("@/db", () => ({
  db: {
    query: {
      pluginRegistrations: { findFirst: findFirstPluginRegistrations },
      memberships: { findFirst: findFirstMemberships },
    },
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
  },
}));

// Mock audit
const mockWriteSystemCommandAudit = vi.fn();
vi.mock("./audit", () => ({
  writeSystemCommandAudit: mockWriteSystemCommandAudit,
}));

// Mock rate limiter
const mockCheckPluginRateLimit = vi.fn();
const mockCheckUserRateLimit = vi.fn();
vi.mock("./rate-limiter", () => ({
  checkPluginRateLimit: mockCheckPluginRateLimit,
  checkUserRateLimit: mockCheckUserRateLimit,
}));

// Mock DAL
const mockInsertNotification = vi.fn();
vi.mock("@/lib/dal/notification", () => ({
  insertNotification: mockInsertNotification,
}));

// Mock manifest schema for re-parsing
vi.mock("@/lib/dto/resource-ai", async () => {
  const { z } = await import("zod");
  return {
    PluginManifestSchema: z.object({
      id: z.string(),
      version: z.string(),
      manifestVersion: z.number().default(1),
      systemCommands: z.array(
        z.discriminatedUnion("command", [
          z.strictObject({ command: z.literal("system.notification") }).merge(
            z.strictObject({
              notificationTypes: z
                .array(z.string().min(1).max(64))
                .min(1),
            }),
          ),
          z.strictObject({ command: z.literal("system.http.request") }).merge(
            z.strictObject({
              allowedDomains: z.array(z.string()).min(1),
              allowedMethods: z.array(z.string()),
            }),
          ),
          z.strictObject({ command: z.literal("system.config") }).merge(
            z.strictObject({
              allowedKeys: z.array(z.string().min(1)).min(1),
            }),
          ),
          z.strictObject({ command: z.literal("system.file") }).merge(
            z.strictObject({
              allowedPaths: z.array(z.string()).min(1),
              allowedOperations: z.array(z.string()),
            }),
          ),
        ]),
      ).default([]),
    }),
    SystemCommandDiscriminatedSchema: z.never(),
    SystemCommandHttpRequestSchema: z.object({}),
    SystemCommandConfigSchema: z.object({}),
    SystemCommandFileSchema: z.object({}),
    SystemCommandNotificationSchema: z.object({}),
  };
});

// Mock contracts
vi.mock("@/features/platform-core/commands/contracts", () => {
  const e = class PlatformCommandExecutionError extends Error {
    readonly failureAttribution: unknown;
    readonly failureEvent: unknown;
    constructor(input: { message: string; failureAttribution: unknown; failureEvent: unknown }) {
      super(input.message);
      this.name = "PlatformCommandExecutionError";
      this.failureAttribution = input.failureAttribution;
      this.failureEvent = input.failureEvent;
    }
  };
  return {
    PlatformCommandExecutionError: e,
    PlatformCommandValidationError: class extends Error {},
  };
});

// Import the handler AFTER all mocks
const {
  systemNotificationHandler,
} = await import("./handler");

const notificationHandler = systemNotificationHandler!["system.notification.send"];

// Helper: build a minimal PlatformCommand for system.notification.send
function makeCommand(overrides: Partial<{
  pluginId: string;
  schoolId: string;
  recipientUserId: string;
  notificationType: string;
  title: string;
  body: string;
  actorId: string;
  correlationId: string;
  commandId: string;
}> = {}) {
  return {
    id: overrides.commandId ?? "cmd-1",
    type: "system.notification.send" as const,
    actor: {
      actorId: overrides.actorId ?? "actor-1",
      actorScope: "plugin" as const,
    },
    scope: {
      schoolId: overrides.schoolId ?? "school-1",
      pluginId: overrides.pluginId ?? "plugin-1",
    },
    payload: {
      recipientUserId: overrides.recipientUserId ?? "user-1",
      notificationType: overrides.notificationType ?? "homework.assigned",
      title: overrides.title ?? "Test Title",
      body: overrides.body ?? "Test Body",
    },
    correlation: {
      correlationId: overrides.correlationId ?? "corr-1",
      causationId: null,
      producer: "test" as const,
    },
    audit: {
      delegatedActor: null,
      approval: null,
    },
    dedupeKey: "dedupe-1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWriteSystemCommandAudit.mockReset();
  mockCheckPluginRateLimit.mockReset();
  mockCheckUserRateLimit.mockReset();
  mockInsertNotification.mockReset();
  findFirstPluginRegistrations.mockReset();
  findFirstMemberships.mockReset();
});

describe("notificationSendAuthorize", () => {
  it("denies when plugin has no matching manifest entry (notification_type_not_allowed)", async () => {
    // Plugin exists but has no system.notification entry
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [],
      },
      lifecycleState: "ready",
    });

    const cmd = makeCommand();

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
      expect(e).toBeInstanceOf(Error);
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    const auditCall = mockWriteSystemCommandAudit.mock.calls[0][0];
    expect(auditCall.decision).toBe("denied");
    expect(auditCall.reasonCode).toBe("notification_type_not_allowed");
    expect(auditCall.commandType).toBe("system.notification.send");
  });

  it("denies when notificationType not in manifest allowlist", async () => {
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [
          {
            command: "system.notification",
            notificationTypes: ["homework.assigned"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    const cmd = makeCommand({ notificationType: "quiz.graded" });

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].reasonCode).toBe(
      "notification_type_not_allowed",
    );
  });

  it("denies when recipientUserId not in schoolId (recipient_not_in_school)", async () => {
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [
          {
            command: "system.notification",
            notificationTypes: ["homework.assigned"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    // Membership not found — user not in school
    findFirstMemberships.mockResolvedValue(null);

    const cmd = makeCommand();

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].reasonCode).toBe(
      "recipient_not_in_school",
    );
  });

  it("denies when plugin rate limit exceeded", async () => {
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [
          {
            command: "system.notification",
            notificationTypes: ["homework.assigned"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    findFirstMemberships.mockResolvedValue({
      userId: "user-1",
      schoolId: "school-1",
      status: "active",
      role: "student",
    });

    mockCheckPluginRateLimit.mockResolvedValue(false); // rate limited
    mockCheckUserRateLimit.mockResolvedValue(true);

    const cmd = makeCommand();

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].reasonCode).toBe(
      "rate_limit_exceeded",
    );
  });

  it("denies when user rate limit exceeded", async () => {
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [
          {
            command: "system.notification",
            notificationTypes: ["homework.assigned"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    findFirstMemberships.mockResolvedValue({
      userId: "user-1",
      schoolId: "school-1",
      status: "active",
      role: "student",
    });

    mockCheckPluginRateLimit.mockResolvedValue(true);
    mockCheckUserRateLimit.mockResolvedValue(false); // user rate limited

    const cmd = makeCommand();

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].reasonCode).toBe(
      "rate_limit_exceeded",
    );
  });

  it("authorizes successfully when all checks pass", async () => {
    findFirstPluginRegistrations.mockResolvedValue({
      id: "plugin-1",
      manifestJson: {
        id: "plugin-1",
        version: "1.0.0",
        systemCommands: [
          {
            command: "system.notification",
            notificationTypes: ["homework.assigned", "quiz.graded"],
          },
        ],
      },
      lifecycleState: "ready",
    });

    findFirstMemberships.mockResolvedValue({
      userId: "user-1",
      schoolId: "school-1",
      status: "active",
      role: "student",
    });

    mockCheckPluginRateLimit.mockResolvedValue(true);
    mockCheckUserRateLimit.mockResolvedValue(true);

    const cmd = makeCommand();

    // Authorize should resolve without throwing
    await notificationHandler.authorize({ command: cmd });

    // No audit should have been written (allowed → audit written in execute)
    expect(mockWriteSystemCommandAudit).not.toHaveBeenCalled();
  });

  it("handles registration_not_found gracefully", async () => {
    // Plugin registration not found
    findFirstPluginRegistrations.mockResolvedValue(null);

    const cmd = makeCommand();

    let thrown = false;
    try {
      await notificationHandler.authorize({ command: cmd });
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].reasonCode).toBe(
      "not_allowlisted",
    );
  });
});

describe("notificationSendExecute", () => {
  it("writes notification and allowed audit", async () => {
    const inserted = {
      id: "notif-1",
      pluginId: "plugin-1",
      schoolId: "school-1",
      recipientUserId: "user-1",
      notificationType: "homework.assigned",
      title: "Test Title",
      body: "Test Body",
      readAt: null,
      createdAt: new Date(1718000000000),
    };

    mockInsertNotification.mockResolvedValue(inserted);

    const cmd = makeCommand();

    const result = await notificationHandler.execute({
      command: cmd,
      attemptNumber: 1,
    });

    expect(mockInsertNotification).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit).toHaveBeenCalled();
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].decision).toBe("allowed");
    expect(mockWriteSystemCommandAudit.mock.calls[0][0].commandType).toBe(
      "system.notification.send",
    );
    expect(result).toBeDefined();
  });
});
