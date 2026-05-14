import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  registerMcpServer,
  registerMcpCredentialRef,
  setMcpCapabilityEnabled,
  recordMcpAudit,
} from "@/lib/dal/mcp";
import { cacheTags } from "@/lib/cache-policy";

const mockUpdateTag = vi.fn();
vi.mock("next/cache", () => ({
  updateTag: mockUpdateTag,
}));

const mockRegisterMcpServer = vi.fn();
const mockRegisterMcpCredentialRef = vi.fn();
const mockSetMcpCapabilityEnabled = vi.fn();
const mockRecordMcpAudit = vi.fn();

vi.mock("@/lib/dal/mcp", () => ({
  registerMcpServer: mockRegisterMcpServer,
  registerMcpCredentialRef: mockRegisterMcpCredentialRef,
  setMcpCapabilityEnabled: mockSetMcpCapabilityEnabled,
  recordMcpAudit: mockRecordMcpAudit,
}));

describe("mcp-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerMcpServerAction", () => {
    const validInput = {
      schoolId: "school-1",
      name: "Test MCP Server",
      url: "https://mcp.example.com",
    };

    it("returns success with server data on valid input", async () => {
      const mockResult = { id: "server-1", ...validInput, status: "active" };
      mockRegisterMcpServer.mockResolvedValue(mockResult);

      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockRegisterMcpServer).toHaveBeenCalledWith(validInput);
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.mcpServer("server-1"));
    });

    it("returns validation error on missing required fields", async () => {
      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
      expect(mockRegisterMcpServer).not.toHaveBeenCalled();
    });

    it("returns validation error on invalid URL", async () => {
      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction({
        schoolId: "school-1",
        name: "Test",
        url: "not-a-valid-url",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("rejects input with forbidden secret keys", async () => {
      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction({
        schoolId: "school-1",
        name: "Test",
        url: "https://mcp.example.com",
        apiKey: "secret-key",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
      expect(mockRegisterMcpServer).not.toHaveBeenCalled();
    });

    it("rejects input with tokenValue key", async () => {
      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction({
        schoolId: "school-1",
        name: "Test",
        url: "https://mcp.example.com",
        tokenValue: "some-token",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("rejects input with clientSecret key", async () => {
      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction({
        schoolId: "school-1",
        name: "Test",
        url: "https://mcp.example.com",
        clientSecret: "secret",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns error on teacher auth failure", async () => {
      mockRegisterMcpServer.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockRegisterMcpServer.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "MCP 元数据操作失败，请重试。",
      });
    });

    it("handles FormData input", async () => {
      const mockResult = { id: "server-1", ...validInput, status: "active" };
      mockRegisterMcpServer.mockResolvedValue(mockResult);

      const formData = new FormData();
      formData.append("schoolId", "school-1");
      formData.append("name", "Test MCP Server");
      formData.append("url", "https://mcp.example.com");

      const { registerMcpServerAction } = await import("./mcp-actions");
      const result = await registerMcpServerAction(formData);

      expect(result).toEqual({ ok: true, data: mockResult });
    });
  });

  describe("registerMcpCredentialRefAction", () => {
    const validInput = {
      serverId: "server-1",
      provider: "github" as const,
      credentialRef: "cred-12345",
      scopes: ["read", "write"],
    };

    it("returns success with credential data on valid input", async () => {
      const mockResult = { id: "cred-1", ...validInput, status: "active" };
      mockRegisterMcpCredentialRef.mockResolvedValue(mockResult);

      const { registerMcpCredentialRefAction } = await import("./mcp-actions");
      const result = await registerMcpCredentialRefAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockRegisterMcpCredentialRef).toHaveBeenCalledWith({
        serverId: "server-1",
        provider: "github",
        credentialRef: "cred-12345",
        scopes: ["read", "write"],
      });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.mcpServer("server-1"));
    });

    it("returns validation error on missing required fields", async () => {
      const { registerMcpCredentialRefAction } = await import("./mcp-actions");
      const result = await registerMcpCredentialRefAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns validation error on invalid provider", async () => {
      const { registerMcpCredentialRefAction } = await import("./mcp-actions");
      const result = await registerMcpCredentialRefAction({
        serverId: "server-1",
        provider: "openai" as any,
        credentialRef: "cred-12345",
        scopes: [],
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("rejects input with forbidden secret keys", async () => {
      const { registerMcpCredentialRefAction } = await import("./mcp-actions");
      const result = await registerMcpCredentialRefAction({
        serverId: "server-1",
        provider: "github",
        credentialRef: "cred-12345",
        scopes: [],
        apiKey: "should-be-rejected",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockRegisterMcpCredentialRef.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { registerMcpCredentialRefAction } = await import("./mcp-actions");
      const result = await registerMcpCredentialRefAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });
  });

  describe("setMcpCapabilityEnabledAction", () => {
    const validInput = {
      serverId: "server-1",
      capabilityId: "capability-1",
      enabled: true,
    };

    it("returns success with updated capability on valid input", async () => {
      const mockResult = {
        id: "capability-1",
        serverId: "server-1",
        name: "Test Capability",
        enabled: true,
      };
      mockSetMcpCapabilityEnabled.mockResolvedValue(mockResult);

      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockSetMcpCapabilityEnabled).toHaveBeenCalledWith({
        capabilityId: "capability-1",
        enabled: true,
      });
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.mcpServer("server-1"));
    });

    it("returns success when disabling capability", async () => {
      const mockResult = {
        id: "capability-1",
        serverId: "server-1",
        name: "Test Capability",
        enabled: false,
      };
      mockSetMcpCapabilityEnabled.mockResolvedValue(mockResult);

      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction({
        serverId: "server-1",
        capabilityId: "capability-1",
        enabled: false,
      });

      expect(result).toEqual({ ok: true, data: mockResult });
    });

    it("returns validation error on missing required fields", async () => {
      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns validation error on non-boolean enabled value", async () => {
      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction({
        serverId: "server-1",
        capabilityId: "capability-1",
        enabled: "yes",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("rejects input with forbidden secret keys", async () => {
      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction({
        serverId: "server-1",
        capabilityId: "capability-1",
        enabled: true,
        secret: "should-be-rejected",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns error on teacher auth failure", async () => {
      mockSetMcpCapabilityEnabled.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { setMcpCapabilityEnabledAction } = await import("./mcp-actions");
      const result = await setMcpCapabilityEnabledAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });
  });

  describe("recordMcpAuditAction", () => {
    const validInput = {
      serverId: "server-1",
      capabilityId: "capability-1",
      targetType: "lesson",
      targetId: "lesson-1",
      status: "success" as const,
      summary: "MCP action completed successfully",
    };

    it("returns success with audit record on valid input", async () => {
      const mockResult = { id: "audit-1", ...validInput, actorId: "teacher-1" };
      mockRecordMcpAudit.mockResolvedValue(mockResult);

      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction(validInput);

      expect(result).toEqual({ ok: true, data: mockResult });
      expect(mockRecordMcpAudit).toHaveBeenCalledWith(validInput);
      expect(mockUpdateTag).toHaveBeenCalledWith(cacheTags.mcpServer("server-1"));
    });

    it("handles denied status", async () => {
      const deniedInput = {
        ...validInput,
        status: "denied" as const,
        deniedReason: "User not authorized",
        summary: "Access denied",
      };
      const mockResult = { id: "audit-1", ...deniedInput, actorId: "teacher-1" };
      mockRecordMcpAudit.mockResolvedValue(mockResult);

      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction(deniedInput);

      expect(result).toEqual({ ok: true, data: mockResult });
    });

    it("handles error status", async () => {
      const errorInput = {
        ...validInput,
        status: "error" as const,
        summary: "Action failed with error",
      };
      const mockResult = { id: "audit-1", ...errorInput, actorId: "teacher-1" };
      mockRecordMcpAudit.mockResolvedValue(mockResult);

      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction(errorInput);

      expect(result).toEqual({ ok: true, data: mockResult });
    });

    it("returns validation error on missing required fields", async () => {
      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction({});

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns validation error on invalid status value", async () => {
      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction({
        serverId: "server-1",
        capabilityId: "capability-1",
        targetType: "lesson",
        targetId: "lesson-1",
        status: "unknown",
        summary: "Test",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("rejects input with forbidden secret keys", async () => {
      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction({
        ...validInput,
        password: "should-be-rejected",
      });

      expect(result).toEqual({
        ok: false,
        error: "VALIDATION_ERROR",
        message: "MCP 配置信息不完整，请检查后再保存。",
      });
    });

    it("returns unauthorized error for teacher auth", async () => {
      mockRecordMcpAudit.mockRejectedValue(new Error("TEACHER_AUTH_REQUIRED"));

      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "UNAUTHORIZED",
        message: "您没有权限执行此操作。",
      });
    });

    it("returns generic error on unexpected exception", async () => {
      mockRecordMcpAudit.mockRejectedValue(new Error("DATABASE_ERROR"));

      const { recordMcpAuditAction } = await import("./mcp-actions");
      const result = await recordMcpAuditAction(validInput);

      expect(result).toEqual({
        ok: false,
        error: "ACTION_FAILED",
        message: "MCP 元数据操作失败，请重试。",
      });
    });
  });

  describe("forbidden key detection", () => {
    const forbiddenKeys = ["secret", "tokenValue", "apiKey", "password", "clientSecret"];

    for (const key of forbiddenKeys) {
      it(`rejects input with forbidden key: ${key}`, async () => {
        const { registerMcpServerAction } = await import("./mcp-actions");
        const result = await registerMcpServerAction({
          schoolId: "school-1",
          name: "Test",
          url: "https://mcp.example.com",
          [key]: "value",
        });

        expect(result).toEqual({
          ok: false,
          error: "VALIDATION_ERROR",
          message: "MCP 配置信息不完整，请检查后再保存。",
        });
      });
    }
  });
});