import "server-only";

import type { ClassroomIncidentListDTO } from "@/lib/dto/classroom-incident-list";

export async function getClassroomIncidentListDTO(): Promise<ClassroomIncidentListDTO> {
  throw new Error("CLASSROOM_INCIDENT_LIST_NOT_IMPLEMENTED");
}
