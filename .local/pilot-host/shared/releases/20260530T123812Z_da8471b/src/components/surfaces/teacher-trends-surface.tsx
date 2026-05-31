import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, CheckSquare, Clock3, TrendingUp, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { surfaceWidths } from '@/components/surfaces/surface-widths'
import type { ClassroomRecentSessionTrendDTO } from '@/lib/dto/classroom'
import { cn } from '@/lib/utils'
import { teacherSurfaceRhythm } from '@/components/surfaces/teacher-surface-rhythm'

type TeacherTrendsSurfaceProps = {
  trend: ClassroomRecentSessionTrendDTO | null
  filters: {
    classId: string | null
    lessonId: string | null
    studentId: string | null
    sessionId: string | null
    view: 'sessions'
    limit: number
  }
}

function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`
}

function buildTrendHref(filters: TeacherTrendsSurfaceProps['filters'], sessionId?: string) {
  const params = new URLSearchParams()

  if (filters.classId) {
    params.set('classId', filters.classId)
  }
  if (filters.lessonId) {
    params.set('lessonId', filters.lessonId)
  }
  if (filters.studentId) {
    params.set('studentId', filters.studentId)
  }
  if (sessionId) {
    params.set('sessionId', sessionId)
  }
  params.set('view', filters.view)
  params.set('limit', String(filters.limit))

  return `/teacher/trends?${params.toString()}`
}

export function TeacherTrendsSurface({ trend, filters }: TeacherTrendsSurfaceProps) {
  if (!trend || trend.sessionPoints.length === 0) {
    return (
      <div className={cn(surfaceWidths.workspace, 'flex w-full flex-col pb-12 pt-3', teacherSurfaceRhythm.stack)}>
        <section className={teacherSurfaceRhythm.hero}>
          <Badge variant="accent" className="bg-surface-container-lowest text-primary">
            班级趋势
          </Badge>
          <div className="mt-4 max-w-4xl space-y-3">
            <h1 className="text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.65rem]">
              暂无跨课堂趋势
            </h1>
            <p className="text-sm leading-7 text-on-surface-variant sm:text-base">
              最近几次课堂结束并完成数据汇总后，这里会显示班级变化、重点学生与可回看的课堂入口。先回到课堂复盘完成本次处理。
            </p>
          </div>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <Link href="/classroom">返回课堂复盘</Link>
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={cn(surfaceWidths.workspace, 'flex w-full flex-col pb-12 pt-3', teacherSurfaceRhythm.stack)}>
      <section className={teacherSurfaceRhythm.hero}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(18rem,22rem)] xl:items-start">
          <div className={cn('min-w-0 space-y-3', surfaceWidths.heroTitle)}>
            <Badge variant="accent" className="bg-surface-container-lowest text-primary">
              班级趋势
            </Badge>
            <div className="space-y-2">
              <h1 className="text-[2.25rem] font-semibold tracking-[-0.03em] text-on-surface sm:text-[2.7rem]">
                先看最近几次课堂发生了什么，再决定回到哪一节复盘
              </h1>
              <p className={cn(surfaceWidths.heroBody, 'text-sm leading-7 text-on-surface-variant sm:text-base')}>
                当前默认按班级查看最近 {trend.sessionPoints.length} 次已结束课堂。先在页内展开异常详情，再把你带回对应课堂复盘或反馈跟进。
              </p>
            </div>
          </div>

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">当前班级</p>
            <h2 className="mt-2 text-[1.45rem] font-semibold text-on-surface">{trend.classSummary.className}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              趋势窗口：最近 {trend.sessionPoints.length} 次结束课堂，聚焦班级变化、重点学生与待反馈工作。
            </p>
            <Badge className="mt-4 w-fit bg-surface-container-low text-on-surface-variant">
              {trend.classSummary.trendLabel}
            </Badge>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <MetricCard label="平均完成率" value={formatRate(trend.classSummary.averageCompletionRate)} icon={<TrendingUp className="size-4" />} />
          <MetricCard label="平均提交率" value={formatRate(trend.classSummary.averageSubmissionRate)} icon={<CheckSquare className="size-4" />} />
          <MetricCard label="需跟进信号" value={String(trend.classSummary.totalFollowUpSignalsCount)} icon={<AlertTriangle className="size-4" />} />
          <MetricCard label="待反馈提交" value={String(trend.classSummary.totalPendingFeedbackCount)} icon={<Clock3 className="size-4" />} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.4fr)]">
        <div className="space-y-5">
          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Class-first recent sessions</p>
                <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">最近 {trend.sessionPoints.length} 次已结束课堂</h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  先比较班级在不同 session 的变化，再决定展开哪一节做进一步处理。
                </p>
              </div>
              <Badge className="w-fit bg-surface-container-low text-on-surface-variant">
                默认 recent-session view
              </Badge>
            </div>

            <div className="mt-5 grid gap-4">
              {trend.sessionPoints.map((point) => {
                const isActive = point.sessionId === trend.selectedSessionId

                return (
                  <Link
                    key={point.sessionId}
                    href={buildTrendHref(filters, point.sessionId)}
                    className={cn(
                      teacherSurfaceRhythm.card,
                      'block bg-surface-container-low p-4 transition hover:-translate-y-0.5 hover:bg-surface-container-lowest',
                      isActive && 'bg-surface-container-lowest shadow-ambient',
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-surface-container-lowest text-on-surface-variant">{point.trendLabel}</Badge>
                          <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                            {point.className}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-on-surface">{point.lessonTitle}</h3>
                        <p className="text-sm leading-6 text-on-surface-variant">
                          完成率 {formatRate(point.completionRate)}，提交率 {formatRate(point.submissionRate)}，
                          {point.followUpSignalsCount} 个需跟进信号。
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-on-surface-variant sm:grid-cols-3 lg:min-w-[18rem] lg:grid-cols-1">
                        <span>待反馈 {point.pendingFeedbackCount}</span>
                        <span>需关注 {point.attentionCount}</span>
                        <span>未评价 {point.unevaluatedCount}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </Card>

          <Card className="bg-surface-container-lowest p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Student focus list</p>
                <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">优先关注的学生</h2>
              </div>
              <Badge className="w-fit bg-surface-container-low text-on-surface-variant">
                次级视图
              </Badge>
            </div>

            <div className="mt-5 grid gap-3">
              {trend.studentSummaries.slice(0, 5).map((student) => (
                <div key={student.studentId} className={cn(teacherSurfaceRhythm.card, 'bg-surface-container-low p-4')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-on-surface">{student.studentName}</p>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        {student.latestParticipationLabel}，{student.needsFollowUpSessions} 次课堂需要跟进。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-on-surface-variant">
                      <Badge className="bg-surface-container-lowest text-on-surface-variant">缺交 {student.missingSubmissionSessions}</Badge>
                      <Badge className="bg-surface-container-lowest text-on-surface-variant">待反馈 {student.pendingFeedbackSessions}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="bg-surface-container-lowest p-5 sm:p-6">
          {trend.selectedDetail ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Inline detail</p>
                <h2 className="mt-2 text-[1.35rem] font-semibold text-on-surface">{trend.selectedDetail.session.lessonTitle}</h2>
                <p className="mt-2 text-sm leading-7 text-on-surface-variant">{trend.selectedDetail.summary}</p>
              </div>

              <div className={cn(teacherSurfaceRhythm.card, 'bg-surface-container-low p-4')}>
                <p className="text-sm font-semibold text-on-surface">Session summary</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  完成率 {formatRate(trend.selectedDetail.session.completionRate)}，提交率 {formatRate(trend.selectedDetail.session.submissionRate)}，
                  待反馈 {trend.selectedDetail.session.pendingFeedbackCount}。
                </p>
              </div>

              <div className={cn(teacherSurfaceRhythm.card, 'bg-surface-container-low p-4')}>
                <p className="text-sm font-semibold text-on-surface">Key signals</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {trend.selectedDetail.keySignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </div>

              <div className={cn(teacherSurfaceRhythm.card, 'bg-surface-container-low p-4')}>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <p className="text-sm font-semibold text-on-surface">Impacted students</p>
                </div>
                <div className="mt-3 grid gap-3">
                  {trend.selectedDetail.impactedStudents.length > 0 ? (
                    trend.selectedDetail.impactedStudents.map((student) => (
                      <div key={student.studentId} className="rounded-[1.25rem] bg-surface-container-lowest p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{student.studentName}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {student.participationLabel}，待反馈 {student.pendingFeedbackCount}
                            </p>
                          </div>
                          <Badge className="w-fit bg-surface-container-low text-on-surface-variant">
                            {student.needsFollowUp ? '需优先跟进' : '继续观察'}
                          </Badge>
                        </div>
                        {student.keySignals.length > 0 ? (
                          <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                            {student.keySignals.map((signal) => (
                              <li key={signal}>{signal}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-on-surface-variant">当前异常详情还没有定位到具体学生，可先回到课堂复盘查看整班情况。</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link href={trend.selectedDetail.primaryRecapHref}>
                    回到课堂复盘
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                {trend.selectedDetail.secondaryReviewHref ? (
                  <Button asChild variant="secondary" className="w-full justify-between">
                    <Link href={trend.selectedDetail.secondaryReviewHref}>
                      进入反馈跟进
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Inline detail</p>
              <h2 className="text-[1.35rem] font-semibold text-on-surface">先选择一节课堂</h2>
              <p className="text-sm leading-7 text-on-surface-variant">
                点击左侧异常 session 后，这里会先展开课堂摘要、受影响学生和关键趋势信号，再提供回到课堂复盘的主动作。
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className={cn(teacherSurfaceRhythm.card, 'bg-surface-container-lowest p-4')}>
      <div className="flex items-center gap-2 text-on-surface-variant">
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="mt-3 text-[1.85rem] font-semibold tracking-tight text-on-surface">{value}</p>
    </div>
  )
}
