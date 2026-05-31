'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ClipboardCheck, FileText, MessageCircleMore, TimerReset, UserRoundCheck } from 'lucide-react'

import { ClassroomStudentEvaluationForm } from './classroom-student-evaluation-form'
import { FeedbackComposer } from '@/components/learning/feedback-composer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClassroomStudentDetailDTO, ClassroomStudentDetailTab } from '@/lib/dto/classroom'

const participationLabels: Record<NonNullable<ClassroomStudentDetailDTO['latestParticipationLevel']>, string> = {
  active: '积极参与',
  normal: '正常参与',
  attention: '需要关注',
}

export function ClassroomStudentDetailPanel({
  sessionId,
  detail,
  activeTab,
}: {
  sessionId: string
  detail: ClassroomStudentDetailDTO
  activeTab: ClassroomStudentDetailTab
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const latestParticipationLabel = detail.latestParticipationLevel
    ? participationLabels[detail.latestParticipationLevel]
    : '未评价'

  const latestEvaluation = detail.evaluationEntries[0] ?? null
  const sharedMeta = [
    {
      label: '最近一次参与度',
      value: latestParticipationLabel,
    },
    {
      label: '多源证据',
      value: `${detail.unifiedEvidenceItems.length} 条`,
    },
    {
      label: '待补反馈',
      value: `${detail.attemptSummary.pendingFeedbackCount} 项`,
    },
  ]

  const switchTab = (nextTab: ClassroomStudentDetailTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sessionId', sessionId)
    params.set('studentId', detail.studentId)
    params.set('detailTab', nextTab)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <UserRoundCheck className="size-4 text-primary" aria-hidden />
            单学生详情
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-on-surface">{detail.studentName}</h2>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            在当前课堂运行页里直接查看进度、提交、测验、课堂回应、时间线和过程评价，不再切换到独立 review 页面。
          </p>
        </div>
        <Badge variant="accent">同路由详情</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {sharedMeta.map((item) => (
          <div key={item.label} className="rounded-[1.3rem] bg-surface-container-lowest p-4 shadow-ambient">
            <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-on-surface">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <Button
          type="button"
          variant={activeTab === 'evidence' ? 'primary' : 'secondary'}
          className="min-h-[44px] px-5"
          onClick={() => switchTab('evidence')}
        >
          课堂证据
        </Button>
        <Button
          type="button"
          variant={activeTab === 'evaluation' ? 'primary' : 'secondary'}
          className="min-h-[44px] px-5"
          onClick={() => switchTab('evaluation')}
        >
          过程评价
        </Button>
      </div>

      {activeTab === 'evidence' ? (
        <div className="mt-5 space-y-3">
          {detail.unifiedEvidenceItems.length === 0 ? (
            <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
              还没有记录到该学生的课堂证据。
            </div>
          ) : (
            detail.unifiedEvidenceItems.map((entry) => (
              <article key={entry.id} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  {entry.kind === 'presence' ? <UserRoundCheck className="size-4 text-primary" aria-hidden /> : null}
                  {entry.kind === 'progress' ? <ClipboardCheck className="size-4 text-primary" aria-hidden /> : null}
                  {entry.kind === 'task' || entry.kind === 'quiz' ? <MessageCircleMore className="size-4 text-primary" aria-hidden /> : null}
                  {entry.kind === 'response' || entry.kind === 'observation' ? <FileText className="size-4 text-primary" aria-hidden /> : null}
                  {entry.kind === 'timeline' ? <TimerReset className="size-4 text-primary" aria-hidden /> : null}
                  <span>{entry.title}</span>
                  {entry.createdAt ? (
                    <span>
                      {new Date(entry.createdAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface">
                  {entry.detail}
                </p>
                {entry.feedbackTarget ? (
                  <div className="mt-4">
                    <FeedbackComposer
                      targetType={entry.feedbackTarget.targetType}
                      targetId={entry.feedbackTarget.targetId}
                      latestFeedback={entry.feedbackTarget.latestFeedback}
                    />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
            <p className="text-sm font-medium text-on-surface">最近评价记录</p>
            {latestEvaluation ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestEvaluation.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface">{latestEvaluation.observationNote}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-on-surface-variant">尚未留下过程评价记录。</p>
            )}
          </div>

          {detail.evaluationEntries.length > 1 ? (
            <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
              <p className="text-sm font-medium text-on-surface">历史过程评价</p>
              <div className="mt-3 space-y-3">
                {detail.evaluationEntries.slice(1).map((entry) => (
                  <article key={entry.id} className="rounded-[1.15rem] bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                      <span>{participationLabels[entry.participationLevel]}</span>
                      <span>{new Date(entry.createdAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {entry.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span key={`${entry.id}-${tag}`} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-on-surface">{entry.observationNote}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <ClassroomStudentEvaluationForm sessionId={sessionId} studentId={detail.studentId} />
        </div>
      )}
    </Card>
  )
}
