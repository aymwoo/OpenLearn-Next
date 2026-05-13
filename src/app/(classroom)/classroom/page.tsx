import { getClassroomConsoleDTO, getClassroomSnapshotDTO, getClassroomStudentDetailDTO } from '@/lib/dal/classroom'
import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'
import { ClassroomStudentDetailTabSchema } from '@/lib/dto/classroom'

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams?: Promise<{
    sessionId?: string
    studentId?: string
    detailTab?: 'evidence' | 'evaluation'
  }>
}) {
  const consoleData = await getClassroomConsoleDTO()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedSessionId = resolvedSearchParams?.sessionId
  const studentId = resolvedSearchParams?.studentId
  const detailTab = ClassroomStudentDetailTabSchema.safeParse(resolvedSearchParams?.detailTab).success
    ? resolvedSearchParams?.detailTab
    : 'evidence'
  const activeSession = requestedSessionId
    ? consoleData.liveSessions.find((session) => session.id === requestedSessionId) ?? consoleData.liveSessions[0]
    : consoleData.liveSessions[0]
  const snapshot = activeSession ? await getClassroomSnapshotDTO({ sessionId: activeSession.id }) : null
  const studentDetail = activeSession
    ? await getClassroomStudentDetailDTO({ sessionId: activeSession.id, studentId })
    : null

  return (
    <ClassroomConsoleSurface
      consoleData={consoleData}
      initialSnapshot={snapshot}
      studentDetail={studentDetail}
      activeDetailTab={detailTab}
    />
  )
}
