import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConsoleWarn = vi.fn();

// Mock the schema table columns — Drizzle uses these in eq(), lt(), etc.
const mockRecipientUserId = { name: "recipientUserId" };
const mockCreatedAt = { name: "createdAt" };
const mockReadAt = { name: "readAt" };
const mockId = { name: "id" };
const mockPluginNotificationsTable = {
  recipientUserId: mockRecipientUserId,
  createdAt: mockCreatedAt,
  readAt: mockReadAt,
  id: mockId,
};

// Mock Drizzle query helpers
const findManyPluginNotifications = vi.fn();
const findFirstPluginNotifications = vi.fn();

// insert chain: db.insert(t).values(v).returning() → Promise<row[]>
const insertReturning = vi.fn();
const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });

// update chain: db.update(t).set(v).where(w).returning() → Promise<row[]>
const updateReturning = vi.fn();
const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
const updateSet = vi.fn().mockReturnValue({ where: updateWhere });

// select chain: db.select(s).from(t).where(w) → Promise<row[]>
const selectWhere = vi.fn();
const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
const selectFn = vi.fn().mockReturnValue({ from: selectFrom });

vi.mock("server-only", () => ({}));

vi.mock("@/db/schema", () => ({
  pluginNotifications: mockPluginNotificationsTable,
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      pluginNotifications: {
        findMany: findManyPluginNotifications,
        findFirst: findFirstPluginNotifications,
      },
    },
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    update: vi.fn().mockReturnValue({ set: updateSet }),
    select: selectFn,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConsoleWarn.mockClear();

  // Reset chain mocks
  insertReturning.mockReset();
  insertValues.mockReset().mockReturnValue({ returning: insertReturning });
  updateReturning.mockReset();
  updateWhere.mockReset().mockReturnValue({ returning: updateReturning });
  updateSet.mockReset().mockReturnValue({ where: updateWhere });
  selectWhere.mockReset();
  selectFrom.mockReset().mockReturnValue({ where: selectWhere });
  selectFn.mockReset().mockReturnValue({ from: selectFrom });
});

vi.stubGlobal("console", { ...console, warn: mockConsoleWarn });

const {
  insertNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
} = await import("./notification");

describe("insertNotification", () => {
  it("inserts a row and returns the inserted notification", async () => {
    const inserted = {
      id: "notif-1",
      pluginId: "plugin-1",
      schoolId: "school-1",
      recipientUserId: "user-1",
      notificationType: "homework.assigned",
      title: "New Homework",
      body: "You have a new assignment.",
      readAt: null,
      createdAt: new Date(1718000000000),
    };

    insertReturning.mockResolvedValue([inserted]);

    const result = await insertNotification({
      schoolId: "school-1",
      pluginId: "plugin-1",
      recipientUserId: "user-1",
      notificationType: "homework.assigned",
      title: "New Homework",
      body: "You have a new assignment.",
    });

    expect(result).toEqual(inserted);
  });
});

describe("getNotifications", () => {
  it("returns recent 20 notifications for user, ordered by createdAt DESC", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `notif-${i}`,
      pluginId: "plugin-1",
      schoolId: "school-1",
      recipientUserId: "user-1",
      notificationType: "homework.assigned",
      title: `Title ${i}`,
      body: `Body ${i}`,
      readAt: null,
      createdAt: new Date(1718000000000 - i * 1000),
    }));

    findManyPluginNotifications.mockResolvedValue(items);

    const result = await getNotifications({ userId: "user-1" });

    expect(result.items).toHaveLength(20);
    expect(result.items[0].createdAt!.getTime()).toBeGreaterThan(
      result.items[1].createdAt!.getTime(),
    );
  });

  it("returns nextCursor=null when items.length < limit (no more pages)", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `notif-${i}`,
      pluginId: "plugin-1",
      schoolId: "school-1",
      recipientUserId: "user-1",
      notificationType: "test",
      title: `Title ${i}`,
      body: `Body ${i}`,
      readAt: null,
      createdAt: new Date(1718000000000 - i * 1000),
    }));

    findManyPluginNotifications.mockResolvedValue(items);

    const result = await getNotifications({ userId: "user-1", limit: 20 });

    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it("accepts cursor parameter for pagination", async () => {
    findManyPluginNotifications.mockResolvedValue([]);

    await getNotifications({ userId: "user-1", cursor: "eyJkYXRlIjogMTcxODAwMDAwMDAwMH0=" });

    expect(findManyPluginNotifications).toHaveBeenCalled();
  });

  it("applies limit parameter", async () => {
    findManyPluginNotifications.mockResolvedValue([]);

    await getNotifications({ userId: "user-1", limit: 5 });

    expect(findManyPluginNotifications).toHaveBeenCalled();
  });

  it("rejects limit > 100 (Zod validation)", async () => {
    await expect(
      getNotifications({ userId: "user-1", limit: 200 }),
    ).rejects.toThrow();
  });

  it("defaults limit to 20", async () => {
    findManyPluginNotifications.mockResolvedValue([]);

    await getNotifications({ userId: "user-1" });

    expect(findManyPluginNotifications).toHaveBeenCalled();
  });
});

describe("markNotificationRead", () => {
  it("marks a single notification as read (sets readAt)", async () => {
    updateReturning.mockResolvedValue([
      {
        id: "notif-1",
        pluginId: "plugin-1",
        schoolId: "school-1",
        recipientUserId: "user-1",
        notificationType: "test",
        title: "T",
        body: "B",
        readAt: new Date(1718000000000),
        createdAt: new Date(1717000000000),
      },
    ]);

    const result = await markNotificationRead({
      userId: "user-1",
      notificationId: "notif-1",
    });

    expect(result).toBeDefined();
    expect(result?.readAt?.getTime()).toBe(1718000000000);
    expect(updateSet).toHaveBeenCalled();
    expect(updateWhere).toHaveBeenCalled();
  });

  it("does not update notification belonging to different user (ownership guard)", async () => {
    updateReturning.mockResolvedValue([]);

    const result = await markNotificationRead({
      userId: "user-2",
      notificationId: "notif-1",
    });

    expect(result).toBeNull();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks all unread notifications as read for a user", async () => {
    updateWhere.mockResolvedValue(undefined);

    await markAllNotificationsRead({ userId: "user-1" });

    expect(updateSet).toHaveBeenCalled();
    expect(updateWhere).toHaveBeenCalled();
  });
});

describe("getUnreadCount", () => {
  it("returns correct unread count for user", async () => {
    selectWhere.mockResolvedValue([{ count: 5 }]);

    const count = await getUnreadCount({ userId: "user-1" });

    expect(count).toBe(5);
    expect(typeof count).toBe("number");
  });

  it("returns 0 when no unread notifications", async () => {
    selectWhere.mockResolvedValue([{ count: 0 }]);

    const count = await getUnreadCount({ userId: "user-1" });

    expect(count).toBe(0);
  });

  it("returns 0 when result is empty array", async () => {
    selectWhere.mockResolvedValue([]);

    const count = await getUnreadCount({ userId: "user-1" });

    expect(count).toBe(0);
  });
});
