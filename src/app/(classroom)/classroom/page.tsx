import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'
import {
  getClassroomConsoleDTO,
  getClassroomSessionRecapDTO,
  getClassroomSnapshotDTO,
  getClassroomStudentDetailDTO,
} from '@/features/runtime-platform/classroom'
import { ClassroomSessionRecapDetailTabSchema, ClassroomStudentDetailTabSchema } from '@/lib/dto/classroom'

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams?: Promise<{
    sessionId?: string
    studentId?: string
    stepId?: string
    detailTab?: 'evidence' | 'evaluation'
    recapTab?: 'students' | 'steps'
  }>
}) {
  const consoleData = await getClassroomConsoleDTO()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedSessionId = resolvedSearchParams?.sessionId
  const studentId = resolvedSearchParams?.studentId
  const stepId = resolvedSearchParams?.stepId
  const detailTab = ClassroomStudentDetailTabSchema.safeParse(resolvedSearchParams?.detailTab).success
    ? resolvedSearchParams?.detailTab
    : 'evidence'
  const recapTab = ClassroomSessionRecapDetailTabSchema.safeParse(resolvedSearchParams?.recapTab).success
    ? resolvedSearchParams?.recapTab
    : 'students'
  const activeSession = requestedSessionId
    ? consoleData.sessionEntries.find((session) => session.id === requestedSessionId) ?? consoleData.sessionEntries[0]
    : consoleData.sessionEntries[0]
  const snapshot = activeSession?.status === 'live'
    ? await getClassroomSnapshotDTO({ sessionId: activeSession.id })
    : null
  const recap = activeSession?.status === 'ended'
    ? await getClassroomSessionRecapDTO({ sessionId: activeSession.id, studentId, stepId, detailTab: recapTab })
    : null
  const studentDetail = activeSession?.status === 'live'
    ? await getClassroomStudentDetailDTO({ sessionId: activeSession.id, studentId })
    : null

  return (
    <ClassroomConsoleSurface
      consoleData={consoleData}
      initialSnapshot={snapshot}
      recap={recap}
      studentDetail={studentDetail}
      activeDetailTab={detailTab}
    />
  )
}
