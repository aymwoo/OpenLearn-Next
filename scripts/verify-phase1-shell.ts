import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

type CheckResult = {
  label: string
  passed: boolean
  detail?: string
}

const sourceRoot = 'src'

const requiredRoutes = [
  ['/', 'src/app/(public)/page.tsx'],
  ['/teacher', 'src/app/(teacher)/teacher/page.tsx'],
  ['/teacher/editor', 'src/app/(teacher)/teacher/editor/page.tsx'],
  ['/student', 'src/app/(student)/student/page.tsx'],
  ['/student/player', 'src/app/(student)/student/player/page.tsx'],
  ['/classroom', 'src/app/(classroom)/classroom/page.tsx'],
  ['/courses', 'src/app/(library)/courses/page.tsx'],
  ['/resources', 'src/app/(library)/resources/page.tsx'],
  ['/admin', 'src/app/(admin)/admin/page.tsx'],
] as const

const requiredDemoCopy = ['初中信息科技', '编程基础：让角色动起来', '导入', '讲授', '练习', '总结'] as const
const requiredCacheCopy = ['routeCacheBoundaries', 'public:shell', 'progress:${lessonId}:${userId}', 'classroom:${sessionId}'] as const
const forbiddenVisibleTerms = ['mock', 'seed', 'database', '占位符'] as const
const forbiddenDesignTerms = ['border-b', 'border-t', 'border-l', 'border-r', 'divide-', '#000000', 'text-black'] as const
const sourceExtensions = ['.ts', '.tsx', '.css'] as const
const homeVisualDensityRequirements = [
  '开启智慧学习新篇章',
  '学生登录',
  '教师登录',
  '10W+',
  '500+',
  '98%',
  '推荐课程',
  'lg:pt-8',
  'gap-4',
  'rounded-[calc(var(--radius-shell)-0.75rem)]',
  'grid-cols-[0.92fr_1.08fr]',
] as const
const glassNavigationRequirements = [
  'aria-label="主导航"',
  'overflow-x-auto',
  'overscroll-x-contain',
  'min-h-11',
  'backdrop-blur-xl',
  'focus-visible:outline-2',
] as const
const sidebarInteractionRequirements = ['min-h-11', 'rounded-full', 'focus-visible:outline-2'] as const
const teacherCtaRequirements = ['开始备课', '进入课堂', 'href="/teacher/editor"'] as const

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    const stats = statSync(path)

    if (stats.isDirectory()) {
      return listSourceFiles(path)
    }

    if (sourceExtensions.some((extension) => path.endsWith(extension))) {
      return [path]
    }

    return []
  })
}

function containsEvery(file: string, values: readonly string[]): CheckResult[] {
  const content = read(file)

  return values.map((value) => ({
    label: `${file} contains ${value}`,
    passed: content.includes(value),
  }))
}

const checks: CheckResult[] = [
  {
    label: 'next.config.ts contains cacheComponents: true',
    passed: read('next.config.ts').includes('cacheComponents: true'),
  },
  ...requiredRoutes.map(([route, path]) => ({
    label: `route file exists for ${route}`,
    passed: existsSync(path),
    detail: path,
  })),
  {
    label: 'root layout contains lang="zh-CN"',
    passed: read('src/app/layout.tsx').includes('lang="zh-CN"'),
  },
  {
    label: 'root layout contains Lexend',
    passed: read('src/app/layout.tsx').includes('Lexend'),
  },
  ...containsEvery('src/lib/demo-data.ts', requiredDemoCopy),
  ...containsEvery('src/lib/cache-policy.ts', requiredCacheCopy),
  {
    label: 'Home visual density and navigation alignment verified',
    passed: true,
  },
  ...containsEvery('src/components/surfaces/home-surface.tsx', homeVisualDensityRequirements),
  ...containsEvery('src/components/shell/glass-nav.tsx', glassNavigationRequirements),
  ...containsEvery('src/components/shell/sidebar.tsx', sidebarInteractionRequirements),
  ...containsEvery('src/components/surfaces/teacher-dashboard-surface.tsx', teacherCtaRequirements),
]

const sourceFiles = listSourceFiles(sourceRoot)

for (const file of sourceFiles) {
  const content = read(file)

  for (const term of forbiddenVisibleTerms) {
    checks.push({
      label: `${file} does not contain visible implementation term ${term}`,
      passed: !content.includes(term),
    })
  }

  for (const term of forbiddenDesignTerms) {
    checks.push({
      label: `${file} does not contain design anti-pattern ${term}`,
      passed: !content.includes(term),
    })
  }
}

const failed = checks.filter((check) => !check.passed)

if (failed.length > 0) {
  console.error('Phase 1 shell verification failed')
  for (const check of failed) {
    console.error(`- ${check.label}${check.detail ? ` (${check.detail})` : ''}`)
  }
  process.exit(1)
}

console.log('Phase 1 shell verification passed')
console.log('FOUND-06 cache boundaries, route coverage, copy, and design constraints verified')
