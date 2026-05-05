import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { memberships, schools, users } from "@/db/schema";

const TEST_SCHOOL_NAME = "OpenLearn 测试学校";

const TEST_ACCOUNTS = [
  { name: "测试教师", email: "teacher@example.com", password: "password" },
  { name: "测试学生", email: "student@example.com", password: "password" },
] as const;

async function seedTestAccounts() {
  const testSchool = await getOrCreateTestSchool();

  for (const account of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    const user = await upsertTestUser(account, passwordHash);

    if (account.email === "teacher@example.com") {
      await ensureActiveMembership(user.id, testSchool.id, "teacher");
    }

    if (account.email === "student@example.com") {
      await ensureActiveMembership(user.id, testSchool.id, "student");
    }
  }
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
      .set({ name: account.name, password: passwordHash })
      .where(eq(users.id, existingUser.id));

    return existingUser;
  }

  const insertedUsers = await db
    .insert(users)
    .values({
      name: account.name,
      email: account.email,
      password: passwordHash,
    })
    .returning({ id: users.id });

  return insertedUsers[0];
}

async function ensureActiveMembership(userId: string, schoolId: string, role: "teacher" | "student") {
  const existingMemberships = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.schoolId, schoolId)))
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

seedTestAccounts()
  .then(() => {
    console.log(
      "测试账号 seed 完成：teacher@example.com 具备 active teacher membership；student@example.com 具备 active student membership"
    );
  })
  .catch((error: unknown) => {
    console.error("测试账号 seed 失败：", error);
    process.exit(1);
  });
