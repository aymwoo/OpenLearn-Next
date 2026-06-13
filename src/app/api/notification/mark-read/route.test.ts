import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();
vi.mock("@/lib/dal/notification", () => ({
  markNotificationRead: mockMarkNotificationRead,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth/auth", () => ({
  auth: mockAuth,
}));

const { POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkNotificationRead.mockReset();
  mockMarkAllNotificationsRead.mockReset();
  mockAuth.mockReset();
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/notification/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/notification/mark-read", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ markAll: false, notificationId: "notif-1" }),
    );

    expect(response.status).toBe(401);
  });

  it("marks a single notification as read", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockMarkNotificationRead.mockResolvedValue({ id: "notif-1" });

    const response = await POST(
      makeRequest({ markAll: false, notificationId: "notif-1" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockMarkNotificationRead).toHaveBeenCalledWith({
      userId: "user-1",
      notificationId: "notif-1",
    });
  });

  it("marks all notifications as read", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockMarkAllNotificationsRead.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ markAll: true }));

    expect(response.status).toBe(200);
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith({
      userId: "user-1",
    });
  });

  it("returns 400 for invalid body (missing both markAll and notificationId)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it("does not update notification belonging to another user (DAL ownership guard)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-2" } });
    // DAL returns null when user doesn't own the notification
    mockMarkNotificationRead.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ markAll: false, notificationId: "notif-other" }),
    );

    expect(response.status).toBe(200);
    // The DAL function was called with the correct userId
    expect(mockMarkNotificationRead).toHaveBeenCalledWith({
      userId: "user-2",
      notificationId: "notif-other",
    });
  });
});
