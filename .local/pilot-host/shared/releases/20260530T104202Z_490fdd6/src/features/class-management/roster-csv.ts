import type { ImportRosterRowInput } from "@/lib/dto/class-management";
import { normalizeStudentGender } from "@/lib/dto/class-management";

export function parseRosterImportCsv(content: string): ImportRosterRowInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).flatMap((line) => {
    const [className, studentName, studentNumber, genderValue] = line
      .split(",")
      .map((segment) => segment.replace(/^"|"$/g, "").trim());
    const gender = normalizeStudentGender(genderValue);

    if (!className || !studentName || !studentNumber || !gender) {
      return [];
    }

    return [{ className, studentName, studentNumber, gender }];
  });
}
