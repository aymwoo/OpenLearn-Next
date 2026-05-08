import { getClassroomConsoleDTO, getClassroomSnapshotDTO } from '@/lib/dal/classroom'
import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>
}) {
  const consoleData = await getClassroomConsoleDTO()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedSessionId = resolvedSearchParams?.sessionId
  const activeSession = requestedSessionId
    ? consoleData.liveSessions.find((session) => session.id === requestedSessionId) ?? consoleData.liveSessions[0]
    : consoleData.liveSessions[0]
  const snapshot = activeSession ? await getClassroomSnapshotDTO({ sessionId: activeSession.id }) : null

  return <ClassroomConsoleSurface consoleData={consoleData} initialSnapshot={snapshot} />
}
