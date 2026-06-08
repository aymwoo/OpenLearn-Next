import { redirect } from 'next/navigation'

import { ClassroomConsoleSurface } from '@/components/surfaces/classroom-console-surface'
import { ClassroomLiveSnapshotRefresh } from '@/components/classroom/classroom-live-snapshot-refresh'
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
      tab?: 'control' | 'live-answer'
      detailTab?: 'evidence' | 'evaluation'
      recapTab?: 'students' | 'steps'
  }>
}) {
  const consoleData = await getClassroomConsoleDTO()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedSessionId = resolvedSearchParams?.sessionId
  const studentId = resolvedSearchParams?.studentId
  const stepId = resolvedSearchParams?.stepId
  const requestedTab = resolvedSearchParams?.tab === 'live-answer' ? 'live-answer' : 'control'
  const detailTab = ClassroomStudentDetailTabSchema.safeParse(resolvedSearchParams?.detailTab).success
    ? resolvedSearchParams?.detailTab
    : 'evidence'
  const recapTab = ClassroomSessionRecapDetailTabSchema.safeParse(resolvedSearchParams?.recapTab).success
    ? resolvedSearchParams?.recapTab
    : 'students'
  const activeSession = requestedSessionId
    ? consoleData.sessionEntries.find((session) => session.id === requestedSessionId) ?? consoleData.sessionEntries[0]
    : consoleData.sessionEntries[0]

  if (requestedSessionId && !consoleData.sessionEntries.some((session) => session.id === requestedSessionId)) {
    redirect('/unauthorized')
  }
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
    <>
      {activeSession?.status === 'live' && snapshot ? (
        <ClassroomLiveSnapshotRefresh sessionId={activeSession.id} initialVersion={snapshot.version} initialUpdatedAt={snapshot.updatedAt} />
      ) : null}
      <ClassroomConsoleSurface
        consoleData={consoleData}
        initialSnapshot={snapshot}
        recap={recap}
        studentDetail={studentDetail}
        activeDetailTab={detailTab}
        activeConsoleTab={requestedTab}
      />
    </>
  )
}
