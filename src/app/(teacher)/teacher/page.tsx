import { TeacherDashboardSurface } from '@/components/surfaces/teacher-dashboard-surface'
import { PluginRenderer } from '@/components/plugins/plugin-renderer'
import { assertActiveTeacher } from '@/lib/dal/lesson-authoring'

export default async function TeacherPage() {
  const scope = await assertActiveTeacher()
  const schoolId = scope.schoolIds[0]

  return (
    <div className="min-h-full p-6 lg:p-8">
      <TeacherDashboardSurface />
      {schoolId ? (
        <section className="mx-auto mt-6 flex w-full flex-col gap-3 rounded-[1.75rem] bg-surface-container-low p-3">
          <PluginRenderer anchor="dashboard.widget" schoolId={schoolId} actorId={scope.userId} />
        </section>
      ) : null}
    </div>
  )
}
