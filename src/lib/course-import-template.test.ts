import { describe, expect, it } from "vitest";

import {
  COURSE_IMPORT_COLUMN_MAP,
  buildCourseImportTemplateCsv,
  courseImportTemplateChineseHeaders,
  courseImportTemplateColumns,
  courseImportTemplateSampleRows,
} from "@/lib/course-import-template";

describe("course import template", () => {
  it("keeps the fixed column order", () => {
    expect(courseImportTemplateColumns).toEqual(["title", "subject", "grade", "status"]);
    expect(courseImportTemplateChineseHeaders).toEqual(["标题", "学科", "年级", "课程状态"]);
  });

  it("exports the chinese-to-english column map", () => {
    expect(COURSE_IMPORT_COLUMN_MAP).toMatchObject({
      标题: "title",
      学科: "subject",
      年级: "grade",
      课程状态: "status",
    });
  });

  it("builds csv content with sample rows", () => {
    const csv = buildCourseImportTemplateCsv();

    expect(csv).toContain("标题,学科,年级,课程状态");
    expect(csv).toContain(courseImportTemplateSampleRows[0]?.title ?? "");
  });
});
