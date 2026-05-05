import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

const TEST_ACCOUNTS = [
  { name: "测试教师", email: "teacher@example.com", password: "password" },
  { name: "测试学生", email: "student@example.com", password: "password" },
] as const;

async function seedTestAccounts() {
  for (const account of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
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
      continue;
    }

    await db.insert(users).values({
      name: account.name,
      email: account.email,
      password: passwordHash,
    });
  }
}

seedTestAccounts()
  .then(() => {
    console.log("测试账号 seed 完成：teacher@example.com / student@example.com");
  })
  .catch((error: unknown) => {
    console.error("测试账号 seed 失败：", error);
    process.exit(1);
  });
