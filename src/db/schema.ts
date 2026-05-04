import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const schools = sqliteTable("school", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).$defaultFn(() => Date.now()),
});

export const memberships = sqliteTable(
  "membership",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("schoolId")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'admin', 'teacher', 'student', 'parent', 'developer', 'ai_agent'
    status: text("status").notNull().default("active"),
  },
  (table) => [
    index("membership_userId_idx").on(table.userId),
    index("membership_schoolId_idx").on(table.schoolId)
  ]
);

export const classes = sqliteTable("class", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  schoolId: text("schoolId")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const classMembers = sqliteTable(
  "classMember",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classId: text("classId")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // e.g. 'teacher', 'student'
  },
  (table) => [
    index("classMember_classId_idx").on(table.classId),
    index("classMember_userId_idx").on(table.userId)
  ]
);
