import { StudentDashboardSurface } from '@/components/surfaces/student-dashboard-surface'
import { getStudentDashboardDTO } from '@/lib/dal/learning'

export default async function StudentPage() {
  const dashboard = await getStudentDashboardDTO()

  return <StudentDashboardSurface dashboard={dashboard} />
}
