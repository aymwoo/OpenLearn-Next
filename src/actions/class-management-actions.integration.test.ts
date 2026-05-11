import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseRosterImportCsv } from "@/features/class-management/roster-csv";

const revalidatePath = vi.fn();
const assertActiveTeacher = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/dal/lesson-authoring", () => ({
  assertActiveTeacher,
}));

vi.mock("server-only", () => ({}));

async function bootstrapClassManagementSchema(databaseUrl: string) {
  const client = createClient({ url: databaseUrl });

  await client.execute(`
    CREATE TABLE school (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      createdAt INTEGER
    )
  `);

  await client.execute(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT,
      studentNumber TEXT UNIQUE,
      gender TEXT,
      emailVerified INTEGER,
      password TEXT,
      image TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE membership (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      schoolId TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `);

  await client.execute(`
    CREATE TABLE class (
      id TEXT PRIMARY KEY NOT NULL,
      schoolId TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE classMember (
      id TEXT PRIMARY KEY NOT NULL,
      classId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  await client.execute(`INSERT INTO school (id, name, createdAt) VALUES ('school-1', '晨曦实验学校', 0)`);
  await (client as { close?: () => Promise<void> | void }).close?.();
}

describe("class roster gender integration", () => {
  let databasePath: string;
  let databaseUrl: string;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    databasePath = join("/tmp/opencode", `class-management-${randomUUID()}.db`);
    databaseUrl = `file:${databasePath}`;
    process.env.DB_FILE_NAME = databaseUrl;

    assertActiveTeacher.mockResolvedValue({
      userId: "teacher-1",
      schoolIds: ["school-1"],
    });

    await bootstrapClassManagementSchema(databaseUrl);
  });

  afterEach(() => {
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it("persists gender from CSV through action and exposes it in class management DTO", async () => {
    const csv = [
      "className,studentName,studentNumber,gender",
      "高一（1）班,张三,S2026001,男",
      "高一（1）班,李四,S2026002,女",
    ].join("\n");

    const rows = parseRosterImportCsv(csv);
    expect(rows).toEqual([
      {
        className: "高一（1）班",
        studentName: "张三",
        studentNumber: "S2026001",
        gender: "male",
      },
      {
        className: "高一（1）班",
        studentName: "李四",
        studentNumber: "S2026002",
        gender: "female",
      },
    ]);

    const [{ importClassRosterAction }, { getTeacherClassManagementDTO }] = await Promise.all([
      import("./class-management-actions"),
      import("@/lib/dal/class-management"),
    ]);

    const result = await importClassRosterAction({
      schoolId: "school-1",
      rows,
      createMissingClasses: true,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        ok: true,
        createdClassCount: 1,
        createdStudentCount: 2,
        linkedStudentCount: 2,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/teacher/classes");

    const verificationClient = createClient({ url: databaseUrl });
    const persistedUsers = await verificationClient.execute(
      "SELECT name, studentNumber, gender FROM user ORDER BY studentNumber ASC",
    );

    expect(persistedUsers.rows.map((row) => ({
      name: row.name,
      studentNumber: row.studentNumber,
      gender: row.gender,
    }))).toEqual([
      { name: "张三", studentNumber: "S2026001", gender: "male" },
      { name: "李四", studentNumber: "S2026002", gender: "female" },
    ]);

    const dto = await getTeacherClassManagementDTO();
    expect(dto.classes).toEqual([
      {
        id: expect.any(String),
        schoolId: "school-1",
        name: "高一（1）班",
        studentCount: 2,
        students: [
          {
            userId: expect.any(String),
            name: "张三",
            studentNumber: "S2026001",
            gender: "male",
          },
          {
            userId: expect.any(String),
            name: "李四",
            studentNumber: "S2026002",
            gender: "female",
          },
        ],
      },
    ]);

    await (verificationClient as { close?: () => Promise<void> | void }).close?.();
  });
});
