import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

export const TEST_SCHOOL_NAME = "OpenLearn 测试学校";

export const TEST_ACCOUNTS = [
  { name: "测试教师", email: "teacher@example.com", password: "password" },
  {
    name: "测试学生",
    email: "student@example.com",
    password: "password",
    studentNumber: "student@example.com",
  },
] as const;

const TEST_ACCOUNT_ROLES: Record<
  (typeof TEST_ACCOUNTS)[number]["email"],
  Array<"teacher" | "student" | "admin">
> = {
  "teacher@example.com": ["teacher", "admin"],
  "student@example.com": ["student"],
};

const ROOT_DB_FILE_NAME = "file:local.db";
const PILOT_HOST_SHARED_DB_PATH = resolve(".local/pilot-host/shared/data/local.db");
const PILOT_HOST_SHARED_DB_FILE_NAME = `file:${PILOT_HOST_SHARED_DB_PATH}`;
const PILOT_HOST_MARKER_DIRS = [
  resolve(".local/pilot-host/current"),
  resolve(".local/pilot-host/shared/data"),
];

type SeededTestAccounts = {
  school: { id: string; name: string };
  teacher: { id: string; email: string; name: string };
  student: { id: string; email: string; name: string };
};

type SeedDatabase = LibSQLDatabase<typeof schema>;

export function resolveSeedDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  const explicitDbFileName = env.DB_FILE_NAME?.trim();
  if (explicitDbFileName) {
    return explicitDbFileName;
  }

  const sharedRoot = env.OPENLEARN_SHARED_ROOT?.trim();
  if (sharedRoot) {
    return `file:${resolve(sharedRoot, "data", "local.db")}`;
  }

  const isPilotHostWorkspace = PILOT_HOST_MARKER_DIRS.every((dir) => existsSync(dir));
  if (isPilotHostWorkspace) {
    return PILOT_HOST_SHARED_DB_FILE_NAME;
  }

  return ROOT_DB_FILE_NAME;
}

function createSeedDatabase(databaseUrl: string): SeedDatabase {
  const client = createClient({ url: databaseUrl });
  return drizzle(client, { schema });
}

export async function seedTestAccounts(options?: { dbFileName?: string }): Promise<SeededTestAccounts> {
  const databaseUrl = options?.dbFileName ?? resolveSeedDatabaseUrl();
  const db = createSeedDatabase(databaseUrl);

  const testSchool = await getOrCreateTestSchool(db);
  const seededUsers = new Map<string, { id: string; email: string; name: string }>();

  for (const account of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    const user = await upsertTestUser(db, account, passwordHash);
    seededUsers.set(account.email, { id: user.id, email: account.email, name: account.name });

    for (const role of TEST_ACCOUNT_ROLES[account.email]) {
      await ensureActiveMembership(db, user.id, testSchool.id, role);
    }
  }

  return {
    school: testSchool,
    teacher: seededUsers.get("teacher@example.com")!,
    student: seededUsers.get("student@example.com")!,
  };
}

async function getOrCreateTestSchool(db: SeedDatabase) {
  const existingSchools = await db
    .select({ id: schema.schools.id, name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.name, TEST_SCHOOL_NAME))
    .limit(1);

  const existingSchool = existingSchools[0];
  if (existingSchool) {
    return existingSchool;
  }

  const insertedSchools = await db
    .insert(schema.schools)
    .values({ name: TEST_SCHOOL_NAME })
    .returning({ id: schema.schools.id, name: schema.schools.name });

  return insertedSchools[0];
}

async function upsertTestUser(
  db: SeedDatabase,
  account: (typeof TEST_ACCOUNTS)[number],
  passwordHash: string
) {
  const existingUsers = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, account.email))
    .limit(1);

  const existingUser = existingUsers[0];

  if (existingUser) {
    await db
      .update(schema.users)
      .set({
        name: account.name,
        password: passwordHash,
        studentNumber: "studentNumber" in account ? account.studentNumber : null,
      })
      .where(eq(schema.users.id, existingUser.id));

    return existingUser;
  }

  const insertedUsers = await db
    .insert(schema.users)
    .values({
      name: account.name,
      email: account.email,
      studentNumber: "studentNumber" in account ? account.studentNumber : null,
      password: passwordHash,
    })
    .returning({ id: schema.users.id });

  return insertedUsers[0];
}

async function ensureActiveMembership(
  db: SeedDatabase,
  userId: string,
  schoolId: string,
  role: "teacher" | "student" | "admin"
) {
  const existingMemberships = await db
    .select({ id: schema.memberships.id })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.role, role)))
    .limit(1);

  const existingMembership = existingMemberships[0];

  if (existingMembership) {
    await db
      .update(schema.memberships)
      .set({ role, status: "active" })
      .where(eq(schema.memberships.id, existingMembership.id));
    return;
  }

  await db.insert(schema.memberships).values({
    userId,
    schoolId,
    role,
    status: "active",
  });
}

async function main() {
  const databaseUrl = resolveSeedDatabaseUrl();
  await seedTestAccounts({ dbFileName: databaseUrl });
  console.log(`测试账号 seed 完成（${databaseUrl}）：teacher@example.com 具备 active teacher/admin memberships；student@example.com 具备 active student membership，并作为测试学生登录标识`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("测试账号 seed 失败：", error);
    process.exit(1);
  });
}
