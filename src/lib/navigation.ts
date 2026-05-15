export type NavigationItem = {
  label: string
  href: string
  emphasis?: 'low'
}

export const navigationItems: readonly NavigationItem[] = [
  { label: '首页', href: '/' },
  { label: '教师工作台', href: '/teacher' },
  { label: '学生空间', href: '/student' },
  { label: '课堂运行', href: '/classroom' },
  { label: '课程中心', href: '/courses' },
  { label: '资源中心', href: '/resources' },
  { label: '管理后台', href: '/admin', emphasis: 'low' },
] as const

export const teacherNavigationItems: readonly NavigationItem[] = [
  { label: '工作台', href: '/teacher' },
  { label: '班级趋势', href: '/teacher/trends' },
  { label: '课时编辑', href: '/teacher/editor' },
  { label: '课堂运行', href: '/classroom' },
  { label: '资源中心', href: '/resources' },
] as const

export const studentNavigationItems: readonly NavigationItem[] = [
  { label: '学生空间', href: '/student' },
  { label: '学习播放器', href: '/student/player' },
  { label: '课程中心', href: '/courses' },
] as const

export const classroomNavigationItems: readonly NavigationItem[] = [
  { label: '课堂运行', href: '/classroom' },
  { label: '教师工作台', href: '/teacher' },
  { label: '课时编辑', href: '/teacher/editor' },
] as const

export const adminNavigationItems: readonly NavigationItem[] = [
  { label: '管理后台', href: '/admin', emphasis: 'low' },
  { label: '课程中心', href: '/courses' },
  { label: '资源中心', href: '/resources' },
] as const
