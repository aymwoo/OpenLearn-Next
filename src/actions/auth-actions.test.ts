import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
const dbSelect = vi.fn();

vi.mock("@/lib/auth/auth", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
  signOut: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => dbSelect(...args),
  },
}));

describe("signInAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards roleIntent into credentials sign-in requests", async () => {
    const membershipLimit = vi.fn().mockResolvedValue([{ id: "membership-1" }]);
    const membershipWhere = vi.fn().mockReturnValue({ limit: membershipLimit });
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });

    const userLimit = vi.fn().mockResolvedValue([{ id: "user-1" }]);
    const userWhere = vi.fn().mockReturnValue({ limit: userLimit });
    const userFrom = vi.fn().mockReturnValue({ where: userWhere });

    dbSelect.mockReturnValueOnce({ from: userFrom }).mockReturnValueOnce({ from: membershipFrom });

    const { signInAction } = await import("./auth-actions");
    const formData = new FormData();
    formData.set("email", "teacher@openlearn.dev");
    formData.set("password", "secret");
    formData.set("roleIntent", "teacher");

    await signInAction({}, formData);

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "teacher@openlearn.dev",
      password: "secret",
      roleIntent: "teacher",
      redirectTo: "/teacher",
    });
  });

  it("routes admin credentials sign-in to the admin workspace", async () => {
    const membershipLimit = vi.fn().mockResolvedValue([{ id: "membership-1" }]);
    const membershipWhere = vi.fn().mockReturnValue({ limit: membershipLimit });
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });

    const userLimit = vi.fn().mockResolvedValue([{ id: "user-2" }]);
    const userWhere = vi.fn().mockReturnValue({ limit: userLimit });
    const userFrom = vi.fn().mockReturnValue({ where: userWhere });

    dbSelect.mockReturnValueOnce({ from: userFrom }).mockReturnValueOnce({ from: membershipFrom });

    const { signInAction } = await import("./auth-actions");
    const formData = new FormData();
    formData.set("email", "admin@openlearn.dev");
    formData.set("password", "secret");
    formData.set("roleIntent", "admin");

    await signInAction({}, formData);

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "admin@openlearn.dev",
      password: "secret",
      roleIntent: "admin",
      redirectTo: "/admin",
    });
  });

  it("shows a role-switch hint when a teacher email is entered in student login", async () => {
    const teacherMembershipWhere = vi.fn().mockResolvedValue([{ role: "teacher" }]);
    const teacherMembershipFrom = vi.fn().mockReturnValue({ where: teacherMembershipWhere });

    const teacherUserLimit = vi.fn().mockResolvedValue([{ id: "teacher-user-1" }]);
    const teacherUserWhere = vi.fn().mockReturnValue({ limit: teacherUserLimit });
    const teacherUserFrom = vi.fn().mockReturnValue({ where: teacherUserWhere });

    const studentLookupLimit = vi.fn().mockResolvedValue([]);
    const studentLookupWhere = vi.fn().mockReturnValue({ limit: studentLookupLimit });
    const studentLookupFrom = vi.fn().mockReturnValue({ where: studentLookupWhere });

    dbSelect
      .mockReturnValueOnce({ from: studentLookupFrom })
      .mockReturnValueOnce({ from: teacherUserFrom })
      .mockReturnValueOnce({ from: teacherMembershipFrom });

    const { signInAction } = await import("./auth-actions");
    const formData = new FormData();
    formData.set("email", "teacher@example.com");
    formData.set("password", "secret");
    formData.set("roleIntent", "student");

    await expect(signInAction({}, formData)).resolves.toEqual({
      error: "该账号是教师账号，请切换到教师登录。",
    });

    expect(signIn).not.toHaveBeenCalled();
  });
});
