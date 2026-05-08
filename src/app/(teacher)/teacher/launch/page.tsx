import { ClassroomLaunchSurface } from '@/components/surfaces/classroom-launch-surface'
import { getClassroomConsoleDTO } from '@/lib/dal/classroom'

export default async function TeacherLaunchPage() {
  const consoleData = await getClassroomConsoleDTO()

  return <ClassroomLaunchSurface consoleData={consoleData} />
}
