import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth/auth", () => ({
  auth: vi.fn(),
}));

// Mock DAL
vi.mock("@/lib/dal/files", () => ({
  getFileRecord: vi.fn(),
  listFiles: vi.fn(),
  getFileMetadata: vi.fn(),
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserSchoolIds: vi.fn(),
}));

// Mock facade
vi.mock("@/features/system-commands/facade", () => ({
  dispatchSystemCommand: vi.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { listFiles, getFileMetadata } from "@/lib/dal/files";
import { getCurrentUserSchoolIds } from "@/lib/dal/auth";
import { dispatchSystemCommand } from "@/features/system-commands/facade";

const mockedAuth = vi.mocked(auth);
const mockedListFiles = vi.mocked(listFiles);
const mockedGetFileMetadata = vi.mocked(getFileMetadata);
const mockedGetSchoolIds = vi.mocked(getCurrentUserSchoolIds);
const mockedDispatch = vi.mocked(dispatchSystemCommand);

describe("POST /api/system/file/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const { POST } = await import("./delete/route");
    const req = new Request("http://localhost/api/system/file/delete", {
      method: "POST",
      body: JSON.stringify({ fileId: "test-file-id" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("should return 400 when fileId is missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    const { POST } = await import("./delete/route");
    const req = new Request("http://localhost/api/system/file/delete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("MISSING_FILE_ID");
  });

  it("should return 400 when plugin key is missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    const { POST } = await import("./delete/route");
    const req = new Request("http://localhost/api/system/file/delete", {
      method: "POST",
      headers: {},
      body: JSON.stringify({ fileId: "test-file-id" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("MISSING_PLUGIN_KEY");
  });

  it("should call dispatchSystemCommand and return 200 on success", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    mockedDispatch.mockResolvedValue({
      success: true,
      data: { deleted: true },
      commandId: "cmd-1",
      attemptNumber: 1,
    });

    const { POST } = await import("./delete/route");
    const req = new Request("http://localhost/api/system/file/delete", {
      method: "POST",
      headers: { "x-plugin-key": "test-plugin" },
      body: JSON.stringify({ fileId: "test-file-id" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockedDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        commandType: "system.file.delete",
        pluginKey: "test-plugin",
        actorId: "actor-1",
        fileId: "test-file-id",
      }),
    );
  });
});

describe("GET /api/system/file/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const { GET } = await import("./list/route");
    const req = new Request("http://localhost/api/system/file/list");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("should return file list with cursor-based pagination", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    mockedGetSchoolIds.mockResolvedValue(["school-1"]);
    mockedListFiles.mockResolvedValue({
      files: [
        { id: "f1", fileName: "test.txt", sizeBytes: 100 },
      ],
      nextCursor: "cursor-2",
    } as any);

    const { GET } = await import("./list/route");
    const req = new Request(
      "http://localhost/api/system/file/list?prefix=uploads/&limit=10",
      { headers: { "x-plugin-key": "test-plugin" } },
    );
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toHaveLength(1);
    expect(body.nextCursor).toBe("cursor-2");
    expect(mockedListFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: "school-1",
        pluginId: "test-plugin",
        prefix: "uploads/",
        limit: 10,
      }),
    );
  });

  it("should return empty list with no nextCursor", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    mockedGetSchoolIds.mockResolvedValue(["school-1"]);
    mockedListFiles.mockResolvedValue({
      files: [],
      nextCursor: null,
    } as any);

    const { GET } = await import("./list/route");
    const req = new Request(
      "http://localhost/api/system/file/list",
      { headers: { "x-plugin-key": "test-plugin" } },
    );
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.files).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });
});

describe("GET /api/system/file/metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const { GET } = await import("./metadata/route");
    const req = new Request("http://localhost/api/system/file/metadata?fileId=f1");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("should return 400 when fileId is missing", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    const { GET } = await import("./metadata/route");
    const req = new Request("http://localhost/api/system/file/metadata");
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("MISSING_FILE_ID");
  });

  it("should return file metadata with quota info", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    mockedGetSchoolIds.mockResolvedValue(["school-1"]);
    mockedGetFileMetadata.mockResolvedValue({
      id: "f1",
      sha256: "abc123",
      fileName: "test.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      diskPath: "school-1/test-plugin/abc123.txt",
      createdAt: new Date(),
    } as any);

    // Mock db.query for quota aggregation
    vi.mock("@/db", () => ({
      db: {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => [{ count: 5, totalBytes: 50000 }]),
          })),
        })),
      },
    }));

    const { GET } = await import("./metadata/route");
    const req = new Request(
      "http://localhost/api/system/file/metadata?fileId=f1",
      { headers: { "x-plugin-key": "test-plugin" } },
    );
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fileId).toBe("f1");
    expect(body.sha256).toBe("abc123");
    expect(body.fileName).toBe("test.txt");
  });

  it("should return 404 when file not found", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "actor-1" } } as any);
    mockedGetSchoolIds.mockResolvedValue(["school-1"]);
    mockedGetFileMetadata.mockResolvedValue(null);

    const { GET } = await import("./metadata/route");
    const req = new Request(
      "http://localhost/api/system/file/metadata?fileId=nonexistent",
      { headers: { "x-plugin-key": "test-plugin" } },
    );
    const res = await GET(req as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("FILE_NOT_FOUND");
  });
});
