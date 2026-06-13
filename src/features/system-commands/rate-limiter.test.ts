import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Redis module
const mockEval = vi.fn();

const mockRedis = {
  eval: mockEval,
  status: "ready",
  on: vi.fn(),
  connect: vi.fn(),
};

// Mock getBullmqProducerConnection
vi.mock("@/features/async-tasks/infra/connection", () => ({
  getBullmqProducerConnection: vi.fn(),
}));

// Dynamically import the module under test after mocking
const { checkPluginRateLimit, checkUserRateLimit } = await import("./rate-limiter");

// Re-import after mock setup
const { getBullmqProducerConnection } = await import(
  "@/features/async-tasks/infra/connection"
);

const mockGetConnection = getBullmqProducerConnection as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockEval.mockReset();
  mockGetConnection.mockReset();
});

describe("checkPluginRateLimit", () => {
  it("returns true when Redis counter is below threshold (first call)", async () => {
    mockEval.mockResolvedValue(1); // count = 1, below 60
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkPluginRateLimit("plugin-1");

    expect(result).toBe(true);
    expect(mockEval).toHaveBeenCalledTimes(1);
    // evalArgs order: [0]=script, [1]=numkeys, [2]=key, [3]=ttl
    const evalArgs = mockEval.mock.calls[0];
    expect(evalArgs[1]).toBe(1); // numkeys
    expect(evalArgs[2]).toMatch(/^notif:plugin:plugin-1:\d+$/); // key
  });

  it("returns true when Redis counter equals 60 (at limit, still allowed)", async () => {
    mockEval.mockResolvedValue(60); // count = 60, exactly at limit
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkPluginRateLimit("plugin-1");

    expect(result).toBe(true);
  });

  it("returns false when Redis counter exceeds 60 (rate limited)", async () => {
    mockEval.mockResolvedValue(61); // count = 61, over limit
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkPluginRateLimit("plugin-1");

    expect(result).toBe(false);
  });

  it("returns true (FAIL-OPEN) when Redis connection fails", async () => {
    const mockConsoleWarn = vi.fn();
    vi.stubGlobal("console", { ...console, warn: mockConsoleWarn });
    mockGetConnection.mockRejectedValue(new Error("Connection refused"));

    const result = await checkPluginRateLimit("plugin-1");

    expect(result).toBe(true); // FAIL-OPEN
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it("returns true (FAIL-OPEN) when Redis eval throws", async () => {
    const mockConsoleWarn = vi.fn();
    vi.stubGlobal("console", { ...console, warn: mockConsoleWarn });
    mockEval.mockRejectedValue(new Error("Redis eval error"));
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkPluginRateLimit("plugin-1");

    expect(result).toBe(true); // FAIL-OPEN
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it("uses correct TTL (65 seconds) for plugin rate limit window", async () => {
    mockEval.mockResolvedValue(1);
    mockGetConnection.mockResolvedValue(mockRedis);

    await checkPluginRateLimit("plugin-1");

    // evalArgs: [0]=script, [1]=numkeys, [2]=key, [3]=ttl
    const evalArgs = mockEval.mock.calls[0];
    expect(evalArgs[3]).toBe(65); // TTL in seconds
  });
});

describe("checkUserRateLimit", () => {
  it("returns true when Redis counter is below threshold (first call)", async () => {
    mockEval.mockResolvedValue(1); // count = 1, below 30
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkUserRateLimit("user-1");

    expect(result).toBe(true);
    // Should eval with key matching notif:user:{userId}:{hour}
    const evalArgs = mockEval.mock.calls[0];
    expect(evalArgs[2]).toMatch(/^notif:user:user-1:\d+$/); // key
  });

  it("returns false when Redis counter exceeds 30 (rate limited)", async () => {
    mockEval.mockResolvedValue(31); // count = 31, over limit
    mockGetConnection.mockResolvedValue(mockRedis);

    const result = await checkUserRateLimit("user-1");

    expect(result).toBe(false);
  });

  it("returns true (FAIL-OPEN) when Redis is unavailable", async () => {
    const mockConsoleWarn = vi.fn();
    vi.stubGlobal("console", { ...console, warn: mockConsoleWarn });
    mockGetConnection.mockRejectedValue(new Error("Connection refused"));

    const result = await checkUserRateLimit("user-1");

    expect(result).toBe(true); // FAIL-OPEN
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it("uses correct TTL (3660 seconds) for user rate limit window", async () => {
    mockEval.mockResolvedValue(1);
    mockGetConnection.mockResolvedValue(mockRedis);

    await checkUserRateLimit("user-1");

    // evalArgs: [0]=script, [1]=numkeys, [2]=key, [3]=ttl
    const evalArgs = mockEval.mock.calls[0];
    expect(evalArgs[3]).toBe(3660); // TTL in seconds (61 minutes)
  });
});
