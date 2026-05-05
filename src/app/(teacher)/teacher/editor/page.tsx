import { LessonEditorSurface } from '@/components/surfaces/lesson-editor-surface'
import { getLessonEditorDTO, getTeacherAuthoringOverview } from '@/lib/dal/lesson-authoring'

export default async function TeacherEditorPage() {
  const overview = await getTeacherAuthoringOverview()
  const firstLesson = overview.lessons[0]
  const lesson = firstLesson ? await getLessonEditorDTO(firstLesson.id) : null

  return <LessonEditorSurface overview={overview} lesson={lesson} />
}
