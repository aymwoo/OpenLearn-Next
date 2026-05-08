import { PluginRenderer } from '@/components/plugins/plugin-renderer'
import { LessonEditorSurface } from '@/components/surfaces/lesson-editor-surface'
import { assertActiveTeacher } from '@/lib/dal/lesson-authoring'
import { getLessonEditorDTO, getTeacherAuthoringOverview } from '@/lib/dal/lesson-authoring'
import { listBuiltInTeachingStepTemplates } from '@/lib/dal/plugins'

export default async function TeacherEditorPage() {
  const [scope, overview] = await Promise.all([assertActiveTeacher(), getTeacherAuthoringOverview()])
  const firstLesson = overview.lessons[0]
  const lesson = firstLesson ? await getLessonEditorDTO(firstLesson.id) : null
  const builtInTemplates = lesson
    ? await listBuiltInTeachingStepTemplates({ actorId: scope.userId, schoolId: lesson.course.schoolId })
    : []

  return (
    <div className="space-y-5">
      <LessonEditorSurface overview={overview} lesson={lesson} builtInTemplates={builtInTemplates} />
      {lesson ? (
        <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient">
          <p className="text-sm text-on-surface-variant">插件建议</p>
          <div className="mt-4">
            <PluginRenderer
              anchor="lesson.sidebar"
              schoolId={lesson.course.schoolId}
              actorId={scope.userId}
              contextPayload={{ lessonId: lesson.lesson.id, courseId: lesson.course.id }}
            />
          </div>
        </section>
      ) : null}
    </div>
  )
}
