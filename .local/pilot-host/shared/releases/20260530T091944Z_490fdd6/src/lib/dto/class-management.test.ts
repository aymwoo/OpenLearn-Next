import { describe, expect, it } from "vitest";

import {
  ClassStudentDTOSchema,
  ImportClassRosterInputSchema,
  normalizeStudentGender,
} from "@/lib/dto/class-management";

describe("class management DTO gender support", () => {
  it("normalizes supported gender labels", () => {
    expect(normalizeStudentGender("男")).toBe("male");
    expect(normalizeStudentGender("female")).toBe("female");
    expect(normalizeStudentGender("F")).toBe("female");
    expect(normalizeStudentGender("未知")).toBeNull();
  });

  it("accepts roster rows with Chinese gender labels", () => {
    const result = ImportClassRosterInputSchema.parse({
      schoolId: "school-1",
      rows: [
        {
          className: "高一（1）班",
          studentName: "张三",
          studentNumber: "S2026001",
          gender: "男",
        },
      ],
    });

    expect(result.rows[0]?.gender).toBe("male");
  });

  it("keeps nullable gender on returned student DTOs", () => {
    const result = ClassStudentDTOSchema.parse({
      userId: "user-1",
      name: "张三",
      studentNumber: "S2026001",
      gender: null,
    });

    expect(result.gender).toBeNull();
  });
});
