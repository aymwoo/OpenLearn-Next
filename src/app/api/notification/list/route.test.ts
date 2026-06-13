import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockGetNotifications = vi.fn();
vi.mock("@/lib/dal/notification", () => ({
  getNotifications: mockGetNotifications,
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

// Import after mocks
const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetNotifications.mockReset();
  mockAuth.mockReset();
});

function makeRequest(url: string) {
  return new NextRequest(`http://localhost${url}`);
}

describe("GET /api/notification/list", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeRequest("/api/notification/list"));

    expect(response.status).toBe(401);
  });

  it("returns 200 with paginated items when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetNotifications.mockResolvedValue({
      items: [
        {
          id: "notif-1",
          pluginId: "plugin-1",
          schoolId: "school-1",
          recipientUserId: "user-1",
          notificationType: "test",
          title: "Title",
          body: "Body",
          readAt: null,
          createdAt: new Date(),
        },
      ],
      nextCursor: null,
    });

    const response = await GET(makeRequest("/api/notification/list"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBeNull();
  });

  it("passes cursor and limit from query params", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetNotifications.mockResolvedValue({ items: [], nextCursor: null });

    await GET(makeRequest("/api/notification/list?cursor=abc123&limit=10"));

    expect(mockGetNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        cursor: "abc123",
        limit: 10,
      }),
    );
  });

  it("defaults limit to 20 when not provided", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetNotifications.mockResolvedValue({ items: [], nextCursor: null });

    await GET(makeRequest("/api/notification/list"));

    expect(mockGetNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
      }),
    );
  });
});
