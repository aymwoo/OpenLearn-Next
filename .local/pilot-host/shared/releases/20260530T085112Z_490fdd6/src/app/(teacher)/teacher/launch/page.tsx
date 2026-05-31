import { ClassroomLaunchSurface } from '@/components/surfaces/classroom-launch-surface'
import { getClassroomConsoleDTO } from '@/features/runtime-platform/launch'

export default async function TeacherLaunchPage() {
  const consoleData = await getClassroomConsoleDTO()

  return <ClassroomLaunchSurface consoleData={consoleData} />
}
