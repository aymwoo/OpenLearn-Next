'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FileText, UserRoundCheck } from 'lucide-react'

import { ClassroomStudentEvaluationForm } from './classroom-student-evaluation-form'
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

  const sharedMeta = useMemo(
    () => [
      {
        label: '最近一次参与度',
        value: latestParticipationLabel,
      },
      {
        label: '课堂证据',
        value: `${detail.evidenceEntries.length} 条`,
      },
      {
        label: '过程评价',
        value: `${detail.evaluationEntries.length} 条`,
      },
    ],
    [detail.evaluationEntries.length, detail.evidenceEntries.length, latestParticipationLabel],
  )

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
            保持在当前课堂运行页中查看证据与过程评价，不切换到独立 review 页面。
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
          {detail.evidenceEntries.length === 0 ? (
            <div className="rounded-[1.35rem] bg-surface-container-lowest p-4 text-sm text-on-surface-variant shadow-ambient">
              还没有记录到该学生的课堂证据。
            </div>
          ) : (
            detail.evidenceEntries.map((entry) => (
              <article key={entry.id} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <FileText className="size-4 text-primary" aria-hidden />
                  <span>{new Date(entry.createdAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface">
                  {typeof entry.payload.note === 'string'
                    ? entry.payload.note
                    : JSON.stringify(entry.payload, null, 2)}
                </p>
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

          <ClassroomStudentEvaluationForm sessionId={sessionId} studentId={detail.studentId} />
        </div>
      )}
    </Card>
  )
}
