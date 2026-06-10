'use client'

import { useTransition, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { submitGradeAction } from '@/actions/homework-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SubmissionRow = {
  id: string
  student: string
  studentName?: string
  content: string
  attachmentUrl?: string | null
}

type GradeRow = {
  score?: number | null
  comment?: string | null
}

export type HomeworkGradingPanelProps = {
  sessionId: string
  submission: SubmissionRow | null
  currentGrade: GradeRow | null
  onGradeSaved: () => void
}

/** 简单的系统建议分：基于内容长度（字数的 1/10，最高 100）。 */
function computeAutoScore(content: string): number {
  if (!content) return 0
  return Math.min(100, Math.round(content.length / 10))
}

export function HomeworkGradingPanel({
  sessionId,
  submission,
  currentGrade,
  onGradeSaved,
}: HomeworkGradingPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [score, setScore] = useState<string>(
    currentGrade?.score != null ? String(currentGrade.score) : '',
  )
  const [comment, setComment] = useState<string>(currentGrade?.comment ?? '')
  const [error, setError] = useState<string>('')

  // 当切换学生时重置表单
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null)
  if (submission && submission.id !== lastSubmissionId) {
    setLastSubmissionId(submission.id)
    setScore(currentGrade?.score != null ? String(currentGrade.score) : '')
    setComment(currentGrade?.comment ?? '')
    setError('')
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div>
          <p className="text-sm text-on-surface-variant">选择左侧学生查看详情</p>
        </div>
      </div>
    )
  }

  const autoScore = computeAutoScore(submission.content)

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const result = await submitGradeAction({
        classroomSession: sessionId,
        student: submission.student,
        submission: submission.id,
        score: score !== '' ? Number(score) : undefined,
        comment: comment || undefined,
      })
      if (result.ok) {
        onGradeSaved()
      } else {
        setError(result.message ?? '保存失败，请重试')
      }
    })
  }

  const studentLabel = submission.studentName ?? submission.student

  return (
    <div className="flex h-full flex-col">
      {/* 学生信息头部 */}
      <div className="border-b border-surface-container-low p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">学生答案</p>
            <h3 className="mt-1 text-lg font-semibold text-on-surface">
              {studentLabel}
            </h3>
          </div>
          <Badge variant="accent">系统建议：{autoScore}分</Badge>
        </div>
      </div>

      {/* 答案内容 */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="rounded-[1.25rem] bg-surface-container-lowest p-4 shadow-ambient">
          <p className="text-sm text-on-surface-variant">提交内容</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface">
            {submission.content}
          </p>
          {submission.attachmentUrl ? (
            <a
              href={submission.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              查看附件
            </a>
          ) : null}
        </div>

        {/* 分数输入 */}
        <div className="space-y-1">
          <label
            htmlFor="grade-score"
            className="text-sm font-medium text-on-surface"
          >
            分数
          </label>
          <input
            id="grade-score"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder={`系统建议 ${autoScore} 分`}
            className={cn(
              'w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3 text-sm',
              'border-0 outline-none ring-1 ring-surface-container-low',
              'focus:ring-2 focus:ring-primary/40',
              'placeholder:text-on-surface-variant/60',
            )}
          />
        </div>

        {/* 评语输入 */}
        <div className="space-y-1">
          <label
            htmlFor="grade-comment"
            className="text-sm font-medium text-on-surface"
          >
            评语
          </label>
          <textarea
            id="grade-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="添加评语…"
            className={cn(
              'w-full resize-none rounded-[1.1rem] bg-surface-container-lowest px-4 py-3 text-sm',
              'border-0 outline-none ring-1 ring-surface-container-low',
              'focus:ring-2 focus:ring-primary/40',
              'placeholder:text-on-surface-variant/60',
            )}
          />
        </div>

        {error ? (
          <p className="rounded-[1rem] bg-[#fef2f2] px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      {/* 保存 CTA */}
      <div className="border-t border-surface-container-low p-4">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="min-h-[48px] w-full text-base"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              正在保存...
            </>
          ) : (
            '保存批改'
          )}
        </Button>
      </div>
    </div>
  )
}
