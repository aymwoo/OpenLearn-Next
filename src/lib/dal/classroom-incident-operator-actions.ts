import "server-only";

export async function runClassroomIncidentLightRecovery(_input: {
  classroomSessionId: string;
  stepId: string;
  action: "retry" | "reconcile";
}) {
  throw new Error("CLASSROOM_INCIDENT_LIGHT_RECOVERY_NOT_IMPLEMENTED");
}
