type AssignmentLike = {
  id: string;
  classId: string;
  teacherId: string;
};

type RecurringEntryLike = {
  assignmentId: string;
  weekday: number;
  bellSlotId: string;
};

export type RecurringConflictIndex = {
  exactAssignmentSlotKeys: Set<string>;
  classSlotKeys: Set<string>;
  teacherSlotKeys: Set<string>;
};

export function buildRecurringConflictIndex(assignments: AssignmentLike[], recurringEntries: RecurringEntryLike[]): RecurringConflictIndex {
  const assignmentById = new Map(assignments.map((item) => [item.id, item] as const));

  const exactAssignmentSlotKeys = new Set<string>();
  const classSlotKeys = new Set<string>();
  const teacherSlotKeys = new Set<string>();

  for (const entry of recurringEntries) {
    exactAssignmentSlotKeys.add(`${entry.assignmentId}:${entry.weekday}:${entry.bellSlotId}`);

    const assignment = assignmentById.get(entry.assignmentId);
    if (!assignment) {
      continue;
    }

    classSlotKeys.add(`${assignment.classId}:${entry.weekday}:${entry.bellSlotId}`);
    teacherSlotKeys.add(`${assignment.teacherId}:${entry.weekday}:${entry.bellSlotId}`);
  }

  return {
    exactAssignmentSlotKeys,
    classSlotKeys,
    teacherSlotKeys,
  };
}
