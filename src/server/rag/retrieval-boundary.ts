import { RetrievalFilterDTO } from "@/lib/dto/resource-ai";

export function buildSafeRetrievalFilter(input: RetrievalFilterDTO): Record<string, any> {
  const filter: Record<string, any> = {
    must: [
      { key: "schoolId", match: { value: input.schoolId } },
      { key: "ragEligible", match: { value: true } },
    ],
  };

  if (input.courseId) {
    filter.must.push({ key: "courseId", match: { value: input.courseId } });
  }

  if (input.visibility) {
    filter.must.push({ key: "visibility", match: { value: input.visibility } });
  }

  if (input.resourceId) {
    filter.must.push({ key: "resourceId", match: { value: input.resourceId } });
  }

  if (input.grade) {
    filter.must.push({ key: "grade", match: { value: input.grade } });
  }

  if (input.subject) {
    filter.must.push({ key: "subject", match: { value: input.subject } });
  }

  return filter;
}

export function assertRetrievalScope(input: RetrievalFilterDTO): void {
  if (!input.schoolId) {
    throw new Error("Retrieval scope must include schoolId");
  }
}
