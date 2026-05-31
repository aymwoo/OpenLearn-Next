import { ClassManagementSurface } from '@/components/surfaces/class-management-surface'
import { getTeacherClassManagementDTO } from '@/lib/dal/class-management'

export default async function TeacherClassesPage() {
  const data = await getTeacherClassManagementDTO()

  return (
    <div className="min-h-full p-6 lg:p-8">
      <ClassManagementSurface data={data} />
    </div>
  )
}
