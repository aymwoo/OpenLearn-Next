import { PluginRenderer } from '@/components/plugins/plugin-renderer'
import { surfaceWidths } from '@/components/surfaces/surface-widths'
import { StudentDashboardSurface } from '@/components/surfaces/student-dashboard-surface'
import { getCurrentUserSchoolIds, getCurrentUserDTO } from '@/lib/dal/auth'
import { getStudentDashboardDTO } from '@/lib/dal/learning'

export default async function StudentPage() {
  const [dashboard, schoolIds, user] = await Promise.all([
    getStudentDashboardDTO(),
    getCurrentUserSchoolIds(),
    getCurrentUserDTO(),
  ])

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <StudentDashboardSurface dashboard={dashboard} />
      {schoolIds[0] && user?.id ? (
        <section className={`${surfaceWidths.workspace} flex flex-col gap-3`}>
          <PluginRenderer anchor="dashboard.widget" schoolId={schoolIds[0]} actorId={user.id} />
        </section>
      ) : null}
    </div>
  )
}
