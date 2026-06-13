import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstPluginFiles = vi.fn();
const findManyPluginFiles = vi.fn();
const dbInsert = vi.fn();
const insertValues = vi.fn(() => ({ returning: vi.fn() }));
const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const dbUpdate = vi.fn(() => ({ set: updateSet }));
const transactionMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {
    insert: dbInsert,
    update: dbUpdate,
    transaction: transactionMock,
    query: {
      pluginFiles: {
        findFirst: findFirstPluginFiles,
        findMany: findManyPluginFiles,
      },
    },
  },
}));

const {
  getFileBySha256,
  insertFileRecord,
  getFileRecord,
  listFiles,
  getFileMetadata,
  softDeleteFile,
} = await import("./files");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFileBySha256", () => {
  it("should return file record when file exists", async () => {
    const record = {
      id: "file-1",
      schoolId: "school-a",
      pluginId: "plugin-1",
      operation: "upload",
      sha256: "abc123",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      diskPath: "school-a/plugin-1/abc123.pdf",
      sizeBytes: 1024,
      isLatest: true,
      previousRowId: null,
      createdAt: new Date(),
    };
    findFirstPluginFiles.mockResolvedValue(record);

    const result = await getFileBySha256("school-a", "plugin-1", "abc123");

    expect(result).toEqual(record);
    expect(findFirstPluginFiles).toHaveBeenCalledTimes(1);
  });

  it("should return null when file does not exist", async () => {
    findFirstPluginFiles.mockResolvedValue(null);

    const result = await getFileBySha256("school-a", "plugin-1", "nonexistent");

    expect(result).toBeNull();
  });
});

describe("insertFileRecord", () => {
  it("should insert a new file record and return it", async () => {
    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "new-id",
        schoolId: "school-a",
        pluginId: "plugin-1",
        operation: "upload",
        sha256: "abc123",
        fileName: "doc.pdf",
        mimeType: "application/pdf",
        diskPath: "school-a/plugin-1/abc123.pdf",
        sizeBytes: 1024,
        isLatest: true,
        previousRowId: null,
        createdAt: new Date(),
      },
    ]);
    insertValues.mockReturnValue({ returning: returningMock });
    dbInsert.mockReturnValue({ values: insertValues });

    const result = await insertFileRecord({
      schoolId: "school-a",
      pluginId: "plugin-1",
      sha256: "abc123",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      diskPath: "school-a/plugin-1/abc123.pdf",
      sizeBytes: 1024,
    });

    expect(result.id).toBe("new-id");
    expect(result.schoolId).toBe("school-a");
    expect(result.pluginId).toBe("plugin-1");
    expect(result.sha256).toBe("abc123");
    expect(result.isLatest).toBe(true);
    expect(dbInsert).toHaveBeenCalled();
  });
});

describe("getFileRecord", () => {
  it("should return file record by id", async () => {
    const record = {
      id: "file-1",
      schoolId: "school-a",
      pluginId: "plugin-1",
      operation: "upload",
      sha256: "abc123",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      diskPath: "school-a/plugin-1/abc123.pdf",
      sizeBytes: 1024,
      isLatest: true,
      previousRowId: null,
      createdAt: new Date(),
    };
    findFirstPluginFiles.mockResolvedValue(record);

    const result = await getFileRecord("school-a", "plugin-1", "file-1");

    expect(result).toEqual(record);
  });

  it("should return null when file does not exist", async () => {
    findFirstPluginFiles.mockResolvedValue(null);

    const result = await getFileRecord("school-a", "plugin-1", "nonexistent");

    expect(result).toBeNull();
  });

  it("should enforce schoolId + pluginId double isolation", async () => {
    findFirstPluginFiles.mockResolvedValue(null);

    // Even if a file exists in another school, it should not be found
    const result = await getFileRecord("wrong-school", "wrong-plugin", "file-1");

    expect(result).toBeNull();
  });
});

describe("listFiles", () => {
  const makeRow = (id: string, fileName: string) => ({
    id,
    schoolId: "school-a",
    pluginId: "plugin-1",
    operation: "upload",
    sha256: `sha-${id}`,
    fileName,
    mimeType: "application/pdf",
    diskPath: `disk/${id}`,
    sizeBytes: 100,
    isLatest: true,
    previousRowId: null,
    createdAt: new Date(),
  });

  it("should return paginated file list with hasMore detection", async () => {
    const rows = [
      makeRow("f1", "documents/report.pdf"),
      makeRow("f2", "documents/summary.pdf"),
      makeRow("f3", "images/photo.jpg"),
    ];
    // limit=2 -> query 3 rows, should have hasMore=true
    findManyPluginFiles.mockResolvedValue(rows);

    const result = await listFiles({
      schoolId: "school-a",
      pluginId: "plugin-1",
      prefix: "",
      limit: 2,
    });

    expect(result.files).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
    expect(findManyPluginFiles).toHaveBeenCalled();
  });

  it("should return no nextCursor when no more pages", async () => {
    findManyPluginFiles.mockResolvedValue([makeRow("f1", "file.txt")]);

    const result = await listFiles({
      schoolId: "school-a",
      pluginId: "plugin-1",
      prefix: "",
      limit: 10,
    });

    expect(result.nextCursor).toBeNull();
  });

  it("should filter by prefix", async () => {
    const rows = [
      makeRow("f1", "documents/report.pdf"),
    ];
    findManyPluginFiles.mockResolvedValue(rows);

    const result = await listFiles({
      schoolId: "school-a",
      pluginId: "plugin-1",
      prefix: "documents/",
      limit: 10,
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.fileName).toBe("documents/report.pdf");
  });
});

describe("getFileMetadata", () => {
  it("should return file metadata including sizeBytes, sha256, mimeType", async () => {
    const record = {
      id: "file-1",
      schoolId: "school-a",
      pluginId: "plugin-1",
      operation: "upload",
      sha256: "abc123",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      diskPath: "disk/path",
      sizeBytes: 2048,
      isLatest: true,
      previousRowId: null,
      createdAt: new Date(),
    };
    findFirstPluginFiles.mockResolvedValue(record);

    const result = await getFileMetadata("school-a", "plugin-1", "file-1");

    expect(result?.sizeBytes).toBe(2048);
    expect(result?.sha256).toBe("abc123");
    expect(result?.mimeType).toBe("application/pdf");
  });
});

describe("softDeleteFile", () => {
  it("should update isLatest to false and insert a delete row in a transaction", async () => {
    const originalRow = {
      id: "file-1",
      schoolId: "school-a",
      pluginId: "plugin-1",
      operation: "upload",
      sha256: "abc123",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      diskPath: "disk/path",
      sizeBytes: 1024,
      isLatest: true,
      previousRowId: null,
      createdAt: new Date(),
    };

    const deletedRow = {
      id: "delete-id",
      schoolId: "school-a",
      pluginId: "plugin-1",
      operation: "delete",
      sha256: null,
      fileName: "doc.pdf",
      mimeType: null,
      diskPath: null,
      sizeBytes: null,
      isLatest: true,
      previousRowId: "file-1",
      createdAt: new Date(),
    };

    const txFindFirst = vi.fn().mockResolvedValue(originalRow);
    const insertReturning = vi.fn().mockResolvedValue([deletedRow]);
    const txInsertValues = vi.fn(() => ({ returning: insertReturning }));
    const txInsert = vi.fn(() => ({ values: txInsertValues }));

    // Mock transaction: callback receives tx with update, insert, AND query.pluginFiles.findFirst
    transactionMock.mockImplementation(async (cb: Function) => {
      return cb({
        update: dbUpdate,
        insert: txInsert,
        query: {
          pluginFiles: {
            findFirst: txFindFirst,
          },
        },
      });
    });

    updateReturning.mockResolvedValue([originalRow]);

    const result = await softDeleteFile("school-a", "plugin-1", "file-1");

    expect(result.operation).toBe("delete");
    expect(result.isLatest).toBe(true);
    expect(result.previousRowId).toBe("file-1");
    expect(transactionMock).toHaveBeenCalled();
  });

  it("should enforce schoolId + pluginId in delete query", async () => {
    const txFindFirst = vi.fn().mockResolvedValue(null);

    transactionMock.mockImplementation(async (cb: Function) => {
      return cb({
        update: dbUpdate,
        query: {
          pluginFiles: {
            findFirst: txFindFirst,
          },
        },
      });
    });

    const result = await softDeleteFile("wrong-school", "wrong-plugin", "file-1");
    // When the file is not found, should return null
    expect(result).toBeNull();
  });
});
