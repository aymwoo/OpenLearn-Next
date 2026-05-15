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
});
