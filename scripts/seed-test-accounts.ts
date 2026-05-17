import { pathToFileURL } from "node:url";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { memberships, schools, users } from "@/db/schema";

export const TEST_SCHOOL_NAME = "OpenLearn 测试学校";

export const TEST_ACCOUNTS = [
  { name: "测试教师", email: "teacher@example.com", password: "password" },
  { name: "测试学生", email: "student@example.com", password: "password", studentNumber: "student@example.com" },
] as const;

const TEST_ACCOUNT_ROLES: Record<(typeof TEST_ACCOUNTS)[number]["email"], Array<"teacher" | "student" | "admin">> = {
  "teacher@example.com": ["teacher", "admin"],
  "student@example.com": ["student"],
};

type SeededTestAccounts = {
  school: { id: string; name: string };
  teacher: { id: string; email: string; name: string };
  student: { id: string; email: string; name: string };
};

export async function seedTestAccounts(): Promise<SeededTestAccounts> {
  const testSchool = await getOrCreateTestSchool();
  const seededUsers = new Map<string, { id: string; email: string; name: string }>();

  for (const account of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    const user = await upsertTestUser(account, passwordHash);
    seededUsers.set(account.email, { id: user.id, email: account.email, name: account.name });

    for (const role of TEST_ACCOUNT_ROLES[account.email]) {
      await ensureActiveMembership(user.id, testSchool.id, role);
    }
  }

  return {
    school: testSchool,
    teacher: seededUsers.get("teacher@example.com")!,
    student: seededUsers.get("student@example.com")!,
  };
}

async function getOrCreateTestSchool() {
  const existingSchools = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .where(eq(schools.name, TEST_SCHOOL_NAME))
    .limit(1);

  const existingSchool = existingSchools[0];
  if (existingSchool) {
    return existingSchool;
  }

  const insertedSchools = await db
    .insert(schools)
    .values({ name: TEST_SCHOOL_NAME })
    .returning({ id: schools.id, name: schools.name });

  return insertedSchools[0];
}

async function upsertTestUser(
  account: (typeof TEST_ACCOUNTS)[number],
  passwordHash: string
) {
  const existingUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, account.email))
    .limit(1);

  const existingUser = existingUsers[0];

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: account.name,
        password: passwordHash,
        studentNumber: "studentNumber" in account ? account.studentNumber : null,
      })
      .where(eq(users.id, existingUser.id));

    return existingUser;
  }

  const insertedUsers = await db
    .insert(users)
    .values({
      name: account.name,
      email: account.email,
      studentNumber: "studentNumber" in account ? account.studentNumber : null,
      password: passwordHash,
    })
    .returning({ id: users.id });

  return insertedUsers[0];
}

async function ensureActiveMembership(userId: string, schoolId: string, role: "teacher" | "student" | "admin") {
  const existingMemberships = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.schoolId, schoolId), eq(memberships.role, role)))
    .limit(1);

  const existingMembership = existingMemberships[0];

  if (existingMembership) {
    await db
      .update(memberships)
      .set({ role, status: "active" })
      .where(eq(memberships.id, existingMembership.id));
    return;
  }

  await db.insert(memberships).values({
    userId,
    schoolId,
    role,
    status: "active",
  });
}

async function main() {
  await seedTestAccounts();
  console.log(
    "测试账号 seed 完成：teacher@example.com 具备 active teacher/admin memberships；student@example.com 具备 active student membership，并作为测试学生登录标识"
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("测试账号 seed 失败：", error);
    process.exit(1);
  });
}
