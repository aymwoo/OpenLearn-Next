import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetUnreadCount = vi.fn();
vi.mock("@/lib/dal/notification", () => ({
  getUnreadCount: mockGetUnreadCount,
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUnreadCount.mockReset();
  mockAuth.mockReset();
});

function makeRequest(url: string) {
  return new NextRequest(`http://localhost${url}`);
}

describe("GET /api/notification/unread-count", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeRequest("/api/notification/unread-count"));

    expect(response.status).toBe(401);
  });

  it("returns 200 with unread count when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUnreadCount.mockResolvedValue(5);

    const response = await GET(makeRequest("/api/notification/unread-count"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(5);
  });

  it("returns count=0 when no unread notifications", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUnreadCount.mockResolvedValue(0);

    const response = await GET(makeRequest("/api/notification/unread-count"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(0);
  });
});
