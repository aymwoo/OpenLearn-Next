import { TeacherDashboardSurface } from '@/components/surfaces/teacher-dashboard-surface'

export default function TeacherPage() {
  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <TeacherDashboardSurface />
      </div>
    </div>
  )
}
