import { ClassroomIncidentOperatorSurface } from "@/components/surfaces/classroom-incident-operator-surface";
import { getClassroomIncidentOperatorDTO } from "@/lib/dal/classroom-incident-operator";

export default async function ClassroomIncidentLandingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const detail = await getClassroomIncidentOperatorDTO({
    classroomSessionId: sessionId,
  });

  return <ClassroomIncidentOperatorSurface detail={detail} />;
}
