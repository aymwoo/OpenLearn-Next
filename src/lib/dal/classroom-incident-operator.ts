import "server-only";

import type { ClassroomIncidentOperatorDTO } from "@/lib/dto/classroom-incident-operator";

export async function getClassroomIncidentOperatorDTO(_input: {
  classroomSessionId: string;
}): Promise<ClassroomIncidentOperatorDTO> {
  throw new Error("CLASSROOM_INCIDENT_OPERATOR_NOT_IMPLEMENTED");
}
