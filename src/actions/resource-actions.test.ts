import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();

const { mockCreateTeacherResource, mockUpdateTeacherResource, mockSetResourceRagEligibility } = vi.hoisted(() => ({
  mockCreateTeacherResource: vi.fn(),
  mockUpdateTeacherResource: vi.fn(),
  mockSetResourceRagEligibility: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
}));

vi.mock("@/lib/dal/resources", () => ({
  createTeacherResource: mockCreateTeacherResource,
  updateTeacherResource: mockUpdateTeacherResource,
  setResourceRagEligibility: mockSetResourceRagEligibility,
}));

vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    resource: (id: string) => `resource:${id}`,
    resources: (schoolId: string) => `resources:${schoolId}`,
  },
}));

describe("createResourceAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is incomplete", async () => {
    const { createResourceAction } = await import("./resource-actions");

    const result = await createResourceAction({
      schoolId: "school-1",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.any(Object),
      message: "资源信息不完整，请检查后再保存。",
    });
    expect(mockCreateTeacherResource).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags on successful creation", async () => {
    mockCreateTeacherResource.mockResolvedValueOnce({
      id: "resource-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      courseId: null,
      title: "测试资源",
      visibility: "private",
      classification: "other",
      ragEligible: false,
      url: "https://example.com/resource",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { createResourceAction } = await import("./resource-actions");
    const result = await createResourceAction({
      schoolId: "school-1",
      title: "测试资源",
      visibility: "private",
      classification: "other",
      url: "https://example.com/resource",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      id: "resource-1",
      title: "测试资源",
      visibility: "private",
    });
    expect(updateTag).toHaveBeenCalledWith("resources:school-1");
    expect(updateTag).toHaveBeenCalledWith("resource:resource-1");
  });

  it("handles ragEligible as string 'true'", async () => {
    mockCreateTeacherResource.mockResolvedValueOnce({
      id: "resource-2",
      schoolId: "school-1",
      ownerId: "teacher-1",
      courseId: null,
      title: "RAG资源",
      visibility: "private",
      classification: "other",
      ragEligible: true,
      url: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { createResourceAction } = await import("./resource-actions");
    const result = await createResourceAction({
      schoolId: "school-1",
      title: "RAG资源",
      visibility: "private",
      classification: "other",
      ragEligible: "true",
    });

    expect(result.ok).toBe(true);
    expect(mockCreateTeacherResource).toHaveBeenCalledWith(
      expect.objectContaining({ ragEligible: true })
    );
  });

  it("handles DAL errors and returns failure message", async () => {
    mockCreateTeacherResource.mockRejectedValueOnce(new Error("RESOURCE_AUTH_REQUIRED"));

    const { createResourceAction } = await import("./resource-actions");
    const result = await createResourceAction({
      schoolId: "school-1",
      title: "测试资源",
      visibility: "private",
      classification: "other",
    });

    expect(result).toEqual({
      ok: false,
      message: "资源保存失败，请重试。",
    });
  });
});

describe("updateResourceAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when input is incomplete", async () => {
    const { updateResourceAction } = await import("./resource-actions");

    const result = await updateResourceAction("resource-1", {
      title: "",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.any(Object),
      message: "资源信息不完整，请检查后再保存。",
    });
    expect(mockUpdateTeacherResource).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags on successful update", async () => {
    mockUpdateTeacherResource.mockResolvedValueOnce({
      id: "resource-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      courseId: null,
      title: "更新后的资源",
      visibility: "school",
      classification: "other",
      ragEligible: true,
      url: "https://example.com/updated",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { updateResourceAction } = await import("./resource-actions");
    const result = await updateResourceAction("resource-1", {
      title: "更新后的资源",
      visibility: "school",
      classification: "other",
      url: "https://example.com/updated",
      ragEligible: "true",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      id: "resource-1",
      title: "更新后的资源",
      visibility: "school",
    });
    expect(updateTag).toHaveBeenCalledWith("resources:school-1");
    expect(updateTag).toHaveBeenCalledWith("resource:resource-1");
  });

  it("handles DAL errors and returns failure message", async () => {
    mockUpdateTeacherResource.mockRejectedValueOnce(new Error("RESOURCE_NOT_FOUND"));

    const { updateResourceAction } = await import("./resource-actions");
    const result = await updateResourceAction("resource-1", {
      title: "测试",
      visibility: "private",
      classification: "other",
    });

    expect(result).toEqual({
      ok: false,
      message: "资源保存失败，请重试。",
    });
  });
});

describe("setResourceRagEligibilityAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns validation error when resourceId is missing", async () => {
    const { setResourceRagEligibilityAction } = await import("./resource-actions");

    const result = await setResourceRagEligibilityAction({
      ragEligible: true,
    });

    expect(result).toEqual({
      ok: false,
      error: expect.any(Object),
      message: "资源信息不完整，请检查后再保存。",
    });
    expect(mockSetResourceRagEligibility).not.toHaveBeenCalled();
  });

  it("returns success and invalidates cache tags when eligibility is updated", async () => {
    mockSetResourceRagEligibility.mockResolvedValueOnce({
      id: "resource-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      courseId: null,
      title: "测试资源",
      visibility: "private",
      classification: "other",
      ragEligible: true,
      url: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { setResourceRagEligibilityAction } = await import("./resource-actions");
    const result = await setResourceRagEligibilityAction({
      resourceId: "resource-1",
      ragEligible: true,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      id: "resource-1",
      ragEligible: true,
    });
    expect(updateTag).toHaveBeenCalledWith("resources:school-1");
    expect(updateTag).toHaveBeenCalledWith("resource:resource-1");
  });

  it("handles ragEligible as string 'false'", async () => {
    mockSetResourceRagEligibility.mockResolvedValueOnce({
      id: "resource-1",
      schoolId: "school-1",
      ownerId: "teacher-1",
      courseId: null,
      title: "测试资源",
      visibility: "private",
      classification: "other",
      ragEligible: false,
      url: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { setResourceRagEligibilityAction } = await import("./resource-actions");
    const result = await setResourceRagEligibilityAction({
      resourceId: "resource-1",
      ragEligible: "false",
    });

    expect(result.ok).toBe(true);
    expect(mockSetResourceRagEligibility).toHaveBeenCalledWith(
      expect.objectContaining({ ragEligible: false })
    );
  });

  it("handles DAL errors and returns failure message", async () => {
    mockSetResourceRagEligibility.mockRejectedValueOnce(new Error("RESOURCE_NOT_FOUND"));

    const { setResourceRagEligibilityAction } = await import("./resource-actions");
    const result = await setResourceRagEligibilityAction({
      resourceId: "resource-1",
      ragEligible: true,
    });

    expect(result).toEqual({
      ok: false,
      message: "资源保存失败，请重试。",
    });
  });
});
