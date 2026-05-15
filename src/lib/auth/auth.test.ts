import { beforeEach, describe, expect, it, vi } from "vitest";

const compare = vi.fn();
const dbSelect = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...args: unknown[]) => compare(...args),
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => dbSelect(...args),
  },
}));

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn(() => ({}) ),
}));

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects sign-in when the requested role membership is missing", async () => {
    const membershipLimit = vi.fn().mockResolvedValue([]);
    const membershipWhere = vi.fn().mockReturnValue({ limit: membershipLimit });
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });

    const userLimit = vi.fn().mockResolvedValue([
      { id: "user-1", name: "Teacher", email: "teacher@openlearn.dev", password: "hashed" },
    ]);
    const userWhere = vi.fn().mockReturnValue({ limit: userLimit });
    const userFrom = vi.fn().mockReturnValue({ where: userWhere });

    dbSelect.mockReturnValueOnce({ from: userFrom }).mockReturnValueOnce({ from: membershipFrom });

    const { authorizeCredentials } = await import("./auth");

    await expect(
      authorizeCredentials({
        email: "teacher@openlearn.dev",
        password: "secret",
        roleIntent: "teacher",
      })
    ).resolves.toBeNull();

    expect(compare).not.toHaveBeenCalled();
  });

  it("looks up student sign-in by student number and requires the matching role intent", async () => {
    const membershipLimit = vi.fn().mockResolvedValue([{ id: "membership-1" }]);
    const membershipWhere = vi.fn().mockReturnValue({ limit: membershipLimit });
    const membershipFrom = vi.fn().mockReturnValue({ where: membershipWhere });

    const userLimit = vi.fn().mockResolvedValue([
      { id: "user-2", name: "Student", email: "student@openlearn.dev", password: "hashed" },
    ]);
    const userWhere = vi.fn().mockReturnValue({ limit: userLimit });
    const userFrom = vi.fn().mockReturnValue({ where: userWhere });

    compare.mockResolvedValue(true);
    dbSelect.mockReturnValueOnce({ from: userFrom }).mockReturnValueOnce({ from: membershipFrom });

    const { authorizeCredentials } = await import("./auth");
    const user = await authorizeCredentials({
      email: "S2026001",
      password: "secret",
      roleIntent: "student",
    });

    expect(user).toEqual({
      id: "user-2",
      name: "Student",
      email: "student@openlearn.dev",
      roles: ["student"],
    });
    expect(compare).toHaveBeenCalledWith("secret", "hashed");
  });
});
