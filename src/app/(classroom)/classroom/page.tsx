import { getClassroomConsoleDTO, getClassroomSnapshotDTO } from '@/lib/dal/classroom'
import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'

export default async function ClassroomPage() {
  const consoleData = await getClassroomConsoleDTO()
  const activeSession = consoleData.liveSessions[0]
  const snapshot = activeSession ? await getClassroomSnapshotDTO({ sessionId: activeSession.id }) : null

  return <ClassroomConsoleSurface consoleData={consoleData} initialSnapshot={snapshot} />
}
