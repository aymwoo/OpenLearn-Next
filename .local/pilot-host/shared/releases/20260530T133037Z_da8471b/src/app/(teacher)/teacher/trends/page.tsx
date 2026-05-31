import { TeacherTrendsSurface } from '@/components/surfaces/teacher-trends-surface'
import { getClassroomConsoleDTO, getTeacherRecentSessionTrendDTO } from '@/lib/dal/classroom'
import { ClassroomTrendViewSchema } from '@/lib/dto/classroom'

type TeacherTrendsPageSearchParams = {
  classId?: string
  lessonId?: string
  studentId?: string
  sessionId?: string
  view?: string
  limit?: string
}

function parseLimit(limit?: string) {
  const parsed = Number(limit)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 4
  }

  return Math.min(parsed, 4)
}

function resolveDefaultClassId(consoleData: Awaited<ReturnType<typeof getClassroomConsoleDTO>>) {
  return (
    consoleData.sessionEntries[0]?.classId ??
    consoleData.publishedLessons.flatMap((lesson) => lesson.classes)[0]?.id ??
    null
  )
}

export default async function TeacherTrendsPage({
  searchParams,
}: {
  searchParams?: Promise<TeacherTrendsPageSearchParams>
}) {
  const consoleData = await getClassroomConsoleDTO()
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const classId = resolvedSearchParams.classId ?? resolveDefaultClassId(consoleData)
  const lessonId = resolvedSearchParams.lessonId ?? null
  const studentId = resolvedSearchParams.studentId ?? null
  const sessionId = resolvedSearchParams.sessionId ?? null
  const view = ClassroomTrendViewSchema.safeParse(resolvedSearchParams.view).data ?? 'sessions'
  const limit = parseLimit(resolvedSearchParams.limit)
  const trend = classId
    ? await getTeacherRecentSessionTrendDTO({
        classId,
        lessonId: lessonId ?? undefined,
        studentId: studentId ?? undefined,
        sessionId: sessionId ?? undefined,
        view,
        limit,
      })
    : null

  return (
    <div className="min-h-full w-full p-6 lg:p-8">
      <TeacherTrendsSurface
        trend={trend}
        filters={{
          classId,
          lessonId,
          studentId,
          sessionId,
          view,
          limit,
        }}
      />
    </div>
  )
}
