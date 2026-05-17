import { beforeEach, describe, expect, it, vi } from "vitest";

const updateTag = vi.fn();
const revalidatePath = vi.fn();

// Mutable auth state shared between the mock factory and beforeEach
const authState = {
  userId: "user-1",
  userName: "Teacher",
  schoolIds: ["school-1"],
  throwError: null as string | null,
  throwSchoolError: false,
};

const registerThemeTokensMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath,
}));

vi.mock("@/lib/dal/auth", () => ({
  getCurrentUserDTO: vi.fn().mockImplementation(async () => {
    if (authState.throwError) throw new Error(authState.throwError);
    return authState.userId ? { id: authState.userId, name: authState.userName } : null;
  }),
  getCurrentUserSchoolIds: vi.fn().mockImplementation(async () => {
    if (authState.throwError) throw new Error(authState.throwError);
    if (authState.throwSchoolError) return [];
    return authState.schoolIds;
  }),
}));

vi.mock("@/lib/dal/themes", () => ({
  registerThemeTokens: registerThemeTokensMock,
}));

vi.mock("@/lib/cache-policy", () => ({
  cacheTags: {
    themeRegistry: "theme:registry",
    theme: (id: string) => `theme:${id}`,
  },
}));

vi.mock("@/lib/theme-cookie", () => ({
  setActiveThemeId: vi.fn().mockResolvedValue(undefined),
  clearActiveThemeId: vi.fn().mockResolvedValue(undefined),
}));

const { setActiveThemeAction, registerThemeTokensAction } = await import("./theme-actions");

describe("theme-actions", () => {
  beforeEach(() => {
    // Restore defaults
    authState.userId = "user-1";
    authState.userName = "Teacher";
    authState.schoolIds = ["school-1"];
    authState.throwError = null;
    authState.throwSchoolError = false;
    registerThemeTokensMock.mockReset();
  });

  describe("setActiveThemeAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      authState.throwError = "AUTH_REQUIRED";

      const result = await setActiveThemeAction({ themeId: "theme-1" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("returns AUTH_REQUIRED when user has no school memberships", async () => {
      authState.throwSchoolError = true;

      const result = await setActiveThemeAction({ themeId: "theme-1" });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("clears active theme when themeId is empty", async () => {
      const result = await setActiveThemeAction({ themeId: "" });

      expect(result).toMatchObject({ success: true, data: { themeId: null } });
    });

    it("sets active theme when themeId is provided", async () => {
      const result = await setActiveThemeAction({ themeId: "theme-1" });

      expect(result).toMatchObject({ success: true, data: { themeId: "theme-1" } });
    });

    it("trims themeId whitespace before setting", async () => {
      await setActiveThemeAction({ themeId: "  theme-1  " });

      const { setActiveThemeId } = await import("@/lib/theme-cookie");
      expect(setActiveThemeId).toHaveBeenCalledWith("theme-1");
    });

    it("returns error message when setActiveThemeId throws", async () => {
      const { setActiveThemeId } = await import("@/lib/theme-cookie");
      vi.mocked(setActiveThemeId).mockRejectedValueOnce(new Error("COOKIE_SET_FAILED"));

      const result = await setActiveThemeAction({ themeId: "theme-1" });

      expect(result).toMatchObject({ success: false, error: "COOKIE_SET_FAILED" });
    });
  });

  describe("registerThemeTokensAction", () => {
    it("returns AUTH_REQUIRED when user is not logged in", async () => {
      authState.throwError = "AUTH_REQUIRED";

      const result = await registerThemeTokensAction({
        schoolId: "school-1",
        name: "My Theme",
        tokenJson: {},
      });

      expect(result).toMatchObject({ success: false, error: "AUTH_REQUIRED" });
    });

    it("returns THEME_SCOPE_REQUIRED when schoolId is not in user's memberships", async () => {
      authState.schoolIds = ["other-school"];

      const result = await registerThemeTokensAction({
        schoolId: "school-1",
        name: "My Theme",
        tokenJson: {},
      });

      expect(result).toMatchObject({ success: false, error: "THEME_SCOPE_REQUIRED" });
    });

    it("registers theme tokens on success", async () => {
      registerThemeTokensMock.mockResolvedValueOnce({ id: "theme-1", name: "My Theme" });

      const result = await registerThemeTokensAction({
        schoolId: "school-1",
        name: "My Theme",
        tokenJson: { colors: { primary: "#000" } },
      });

      expect(result).toMatchObject({ success: true, data: { id: "theme-1", name: "My Theme" } });
      expect(registerThemeTokensMock).toHaveBeenCalledWith(
        "school-1",
        "My Theme",
        { colors: { primary: "#000" } },
        "user-1",
      );
    });

    it("returns the DAL error message on registerThemeTokens failure", async () => {
      registerThemeTokensMock.mockRejectedValueOnce(new Error("DB_CONSTRAINT_VIOLATION"));

      const result = await registerThemeTokensAction({
        schoolId: "school-1",
        name: "My Theme",
        tokenJson: {},
      });

      expect(result).toMatchObject({ success: false, error: "DB_CONSTRAINT_VIOLATION" });
    });

    it("returns a Zod validation error for missing required fields", async () => {
      const result = await registerThemeTokensAction({ schoolId: "school-1" });

      expect(result).toMatchObject({ success: false });
      expect(result.error).toBeTruthy();
    });

    it("rejects when schoolId is an empty string", async () => {
      const result = await registerThemeTokensAction({
        schoolId: "",
        name: "My Theme",
        tokenJson: {},
      });

      expect(result).toMatchObject({ success: false });
    });
  });
});
