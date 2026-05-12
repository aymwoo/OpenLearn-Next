import "server-only";

import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { classMembers, classes, memberships, users } from "@/db/schema";
import { assertActiveTeacher } from "@/lib/dal/lesson-authoring";
import {
  ImportClassRosterInputSchema,
  ImportClassesInputSchema,
  DeleteClassesInputSchema,
  DeleteStudentsInputSchema,
  ResetStudentPasswordsInputSchema,
  TeacherClassManagementDTOSchema,
  UpdateClassNameInputSchema,
  type ClassStudentDTO,
  type DeleteClassesInput,
  type DeleteStudentsInput,
  type ImportClassRosterInput,
  type ImportClassesInput,
  type ResetStudentPasswordsInput,
  type StudentGender,
  type TeacherClassManagementDTO,
  type UpdateClassNameInput,
} from "@/lib/dto/class-management";

type TeacherScope = Awaited<ReturnType<typeof assertActiveTeacher>>;

type ImportRosterResult =
  | {
      ok: true;
      createdClassCount: number;
      createdStudentCount: number;
      linkedStudentCount: number;
    }
  | {
      ok: false;
      error: "MISSING_CLASSES";
      missingClassNames: string[];
    };

function assertSchoolAccess(scope: TeacherScope, schoolId: string) {
  if (!scope.schoolIds.includes(schoolId)) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }
}

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

async function getScopedClass(classId: string, scope: TeacherScope) {
  const classRow = await db.query.classes.findFirst({ where: eq(classes.id, classId) });

  if (!classRow || !scope.schoolIds.includes(classRow.schoolId)) {
    throw new Error("CLASS_NOT_FOUND");
  }

  return classRow;
}

async function getScopedStudentIds(studentIds: string[], scope: TeacherScope) {
  const normalizedIds = [...new Set(studentIds.map((item) => item.trim()).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const studentMembershipRows = await db.query.memberships.findMany({
    where: and(
      inArray(memberships.userId, normalizedIds),
      inArray(memberships.schoolId, scope.schoolIds),
      eq(memberships.role, "student"),
    ),
  });

  return [...new Set(studentMembershipRows.map((item) => item.userId))];
}

async function getScopedClassIds(classIds: string[], scope: TeacherScope) {
  const normalizedIds = [...new Set(classIds.map((item) => item.trim()).filter(Boolean))];

  if (normalizedIds.length === 0) {
    return [];
  }

  const classRows = await db.query.classes.findMany({
    where: and(inArray(classes.id, normalizedIds), inArray(classes.schoolId, scope.schoolIds)),
  });

  return classRows.map((item) => item.id);
}

async function ensureClassRecord(schoolId: string, className: string) {
  const trimmedName = className.trim();
  const existing = await db.query.classes.findFirst({
    where: and(eq(classes.schoolId, schoolId), eq(classes.name, trimmedName)),
  });

  if (existing) {
    return { row: existing, created: false };
  }

  const [created] = await db.insert(classes).values({ schoolId, name: trimmedName }).returning();
  return { row: created, created: true };
}

async function ensureStudentUser(studentName: string, studentNumber: string, gender: StudentGender) {
  const trimmedNumber = studentNumber.trim();
  const trimmedName = studentName.trim();
  const existing = await db.query.users.findFirst({ where: eq(users.studentNumber, trimmedNumber) });

  if (existing) {
    if ((existing.name ?? "") !== trimmedName || existing.gender !== gender || existing.email !== trimmedNumber) {
      const [updated] = await db
        .update(users)
        .set({ name: trimmedName, gender, email: trimmedNumber })
        .where(eq(users.id, existing.id))
        .returning();
      return { row: updated, created: false };
    }

    return { row: existing, created: false };
  }

  const [created] = await db
    .insert(users)
    .values({
      name: trimmedName,
      email: trimmedNumber,
      studentNumber: trimmedNumber,
      gender,
    })
    .returning();

  return { row: created, created: true };
}

async function ensureStudentMembership(userId: string, schoolId: string) {
  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.schoolId, schoolId)),
  });

  if (existing) {
    if (existing.role !== "student" || existing.status !== "active") {
      await db
        .update(memberships)
        .set({ role: "student", status: "active" })
        .where(eq(memberships.id, existing.id));
    }
    return;
  }

  await db.insert(memberships).values({
    userId,
    schoolId,
    role: "student",
    status: "active",
  });
}

async function ensureStudentClassMember(classId: string, userId: string) {
  const existing = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, userId)),
  });

  if (existing) {
    if (existing.role !== "student") {
      await db
        .update(classMembers)
        .set({ role: "student" })
        .where(eq(classMembers.id, existing.id));
      return { created: false, linked: true };
    }

    return { created: false, linked: false };
  }

  await db.insert(classMembers).values({ classId, userId, role: "student" });
  return { created: true, linked: true };
}

export async function getTeacherClassManagementDTO(): Promise<TeacherClassManagementDTO> {
  const scope = await assertActiveTeacher();
  const schoolId = scope.schoolIds[0];

  if (!schoolId) {
    throw new Error("TEACHER_AUTH_REQUIRED");
  }

  const classRows = sortByName(
    await db.query.classes.findMany({
      where: eq(classes.schoolId, schoolId),
    }),
  );

  const classIds = classRows.map((item) => item.id);
  const studentMembers = classIds.length
    ? await db.query.classMembers.findMany({
        where: and(inArray(classMembers.classId, classIds), eq(classMembers.role, "student")),
      })
    : [];

  const userIds = [...new Set(studentMembers.map((item) => item.userId))];
  const studentUsers = userIds.length ? await db.query.users.findMany({ where: inArray(users.id, userIds) }) : [];
  const userMap = new Map(studentUsers.map((item) => [item.id, item]));
  const studentsByClass = new Map<string, ClassStudentDTO[]>();

  for (const member of studentMembers) {
    const user = userMap.get(member.userId);
    if (!user) {
      continue;
    }

    const student = {
      userId: user.id,
      name: user.name?.trim() || "未命名学生",
      studentNumber: user.studentNumber?.trim() || user.id,
      gender: user.gender === "male" || user.gender === "female" ? user.gender : null,
    } satisfies ClassStudentDTO;

    const current = studentsByClass.get(member.classId) ?? [];
    current.push(student);
    studentsByClass.set(member.classId, current);
  }

  const dto = {
    schoolId,
    classes: classRows.map((classRow) => {
      const students = [...(studentsByClass.get(classRow.id) ?? [])].sort((left, right) =>
        left.studentNumber.localeCompare(right.studentNumber, "zh-CN"),
      );

      return {
        id: classRow.id,
        schoolId: classRow.schoolId,
        name: classRow.name,
        studentCount: students.length,
        students,
      };
    }),
  };

  return TeacherClassManagementDTOSchema.parse(dto);
}

export async function updateClassNameForTeacher(input: UpdateClassNameInput) {
  const parsed = UpdateClassNameInputSchema.parse(input);
  const scope = await assertActiveTeacher();
  const classRow = await getScopedClass(parsed.classId, scope);

  const [updated] = await db
    .update(classes)
    .set({ name: parsed.name.trim() })
    .where(eq(classes.id, classRow.id))
    .returning();

  return updated;
}

export async function importClassesForTeacher(input: ImportClassesInput) {
  const parsed = ImportClassesInputSchema.parse({
    ...input,
    classNames: input.classNames.map((item) => item.trim()).filter(Boolean),
  });
  const scope = await assertActiveTeacher();
  assertSchoolAccess(scope, parsed.schoolId);

  const uniqueClassNames = [...new Set(parsed.classNames)];
  const existingRows = await db.query.classes.findMany({
    where: eq(classes.schoolId, parsed.schoolId),
  });
  const existingNames = new Set(existingRows.map((item) => item.name));

  let createdCount = 0;
  for (const className of uniqueClassNames) {
    if (existingNames.has(className)) {
      continue;
    }

    await db.insert(classes).values({ schoolId: parsed.schoolId, name: className });
    existingNames.add(className);
    createdCount += 1;
  }

  return {
    totalCount: uniqueClassNames.length,
    createdCount,
    skippedCount: uniqueClassNames.length - createdCount,
  };
}

export async function importClassRosterForTeacher(input: ImportClassRosterInput): Promise<ImportRosterResult> {
  const parsed = ImportClassRosterInputSchema.parse({
    ...input,
    rows: input.rows.map((row) => ({
      className: row.className.trim(),
      studentName: row.studentName.trim(),
      studentNumber: row.studentNumber.trim(),
      gender: row.gender,
    })),
  });
  const scope = await assertActiveTeacher();
  assertSchoolAccess(scope, parsed.schoolId);

  const uniqueClassNames = [...new Set(parsed.rows.map((row) => row.className))];
  const existingClassRows = await db.query.classes.findMany({
    where: eq(classes.schoolId, parsed.schoolId),
  });
  const classMap = new Map(existingClassRows.map((item) => [item.name, item]));
  const missingClassNames = uniqueClassNames.filter((name) => !classMap.has(name));

  if (missingClassNames.length > 0 && !parsed.createMissingClasses) {
    return {
      ok: false,
      error: "MISSING_CLASSES",
      missingClassNames,
    };
  }

  let createdClassCount = 0;
  if (missingClassNames.length > 0) {
    for (const className of missingClassNames) {
      const { row, created } = await ensureClassRecord(parsed.schoolId, className);
      classMap.set(className, row);
      if (created) {
        createdClassCount += 1;
      }
    }
  }

  let createdStudentCount = 0;
  let linkedStudentCount = 0;

  for (const row of parsed.rows) {
    const classRow = classMap.get(row.className);
    if (!classRow) {
      continue;
    }

    const { row: studentRow, created: createdStudent } = await ensureStudentUser(
      row.studentName,
      row.studentNumber,
      row.gender,
    );
    if (createdStudent) {
      createdStudentCount += 1;
    }

    await ensureStudentMembership(studentRow.id, parsed.schoolId);
    const memberResult = await ensureStudentClassMember(classRow.id, studentRow.id);
    if (memberResult.linked) {
      linkedStudentCount += 1;
    }
  }

  return {
    ok: true,
    createdClassCount,
    createdStudentCount,
    linkedStudentCount,
  };
}

export async function resetStudentPasswordsForTeacher(input: ResetStudentPasswordsInput) {
  const parsed = ResetStudentPasswordsInputSchema.parse({
    ...input,
    studentIds: input.studentIds.map((item) => item.trim()).filter(Boolean),
    password: input.password.trim(),
  });
  const scope = await assertActiveTeacher();
  const scopedStudentIds = await getScopedStudentIds(parsed.studentIds, scope);

  if (scopedStudentIds.length === 0) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);
  await db.update(users).set({ password: passwordHash }).where(inArray(users.id, scopedStudentIds));

  return {
    updatedCount: scopedStudentIds.length,
  };
}

export async function deleteStudentsForTeacher(input: DeleteStudentsInput) {
  const parsed = DeleteStudentsInputSchema.parse({
    ...input,
    studentIds: input.studentIds.map((item) => item.trim()).filter(Boolean),
  });
  const scope = await assertActiveTeacher();
  const scopedStudentIds = await getScopedStudentIds(parsed.studentIds, scope);

  if (scopedStudentIds.length === 0) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  await db.delete(users).where(inArray(users.id, scopedStudentIds));

  return {
    deletedCount: scopedStudentIds.length,
  };
}

export async function deleteClassesForTeacher(input: DeleteClassesInput) {
  const parsed = DeleteClassesInputSchema.parse({
    ...input,
    classIds: input.classIds.map((item) => item.trim()).filter(Boolean),
  });
  const scope = await assertActiveTeacher();
  const scopedClassIds = await getScopedClassIds(parsed.classIds, scope);

  if (scopedClassIds.length === 0) {
    throw new Error("CLASS_NOT_FOUND");
  }

  await db.delete(classes).where(inArray(classes.id, scopedClassIds));

  return {
    deletedCount: scopedClassIds.length,
  };
}
