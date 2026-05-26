import { ClassroomIncidentListSurface } from "@/components/surfaces/classroom-incident-list-surface";
import { getClassroomIncidentListDTO } from "@/lib/dal/classroom-incident-list";

export default async function SettingsLabsIncidentsPage() {
  try {
    const list = await getClassroomIncidentListDTO();

    return <ClassroomIncidentListSurface list={list} />;
  } catch (error) {
    return (
      <ClassroomIncidentListSurface
        list={null}
        error={error instanceof Error ? error.message : "CLASSROOM_INCIDENT_LIST_FAILED"}
      />
    );
  }
}
