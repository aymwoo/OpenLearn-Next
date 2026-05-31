import { ClassroomIncidentListSurface } from "@/components/surfaces/classroom-incident-list-surface";
import { getClassroomIncidentListDTO } from "@/lib/dal/classroom-incident-list";

export default async function SettingsLabsIncidentsPage() {
  let list = null
  let errorMessage: string | null = null

  try {
    list = await getClassroomIncidentListDTO()
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "CLASSROOM_INCIDENT_LIST_FAILED"
  }

  return <ClassroomIncidentListSurface list={list} error={errorMessage ?? undefined} />
}
