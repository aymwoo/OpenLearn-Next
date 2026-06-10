'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'

import { getHomeworkSubmissions } from '@/lib/dal/homework'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type SubmissionRow = {
  id: string
  student: string
  studentName?: string
  assignment: string
  content: string
  attachmentUrl?: string | null
  createdAt: string
  isLatest: boolean
}

type GradeRow = {
  score?: number | null
  comment?: string | null
}

export type HomeworkSubmissionListProps = {
  sessionId: string
  selectedStudentId: string | null
  onSelectStudent: (studentId: string, submission: SubmissionRow) => void
  /** 已批改分数映射：studentId → grade */
  gradeMap: Record<string, GradeRow>
}

export function HomeworkSubmissionList({
  sessionId,
  selectedStudentId,
  onSelectStudent,
  gradeMap,
}: HomeworkSubmissionListProps) {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getHomeworkSubmissions({ classroomSession: sessionId })
      setSubmissions((result as SubmissionRow[]) ?? [])
    } catch {
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSubmissions()
    const interval = setInterval(fetchSubmissions, 10_000)
    return () => clearInterval(interval)
  }, [fetchSubmissions])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[64px] w-full rounded-[1.25rem]" />
        ))}
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ClipboardList className="size-10 text-on-surface-variant/40" aria-hidden />
        <div>
          <p className="text-sm font-medium text-on-surface">暂无学生提交</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            学生提交后将在此处显示
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {submissions.map((submission) => {
        const grade = gradeMap[submission.student]
        const isGraded = grade && typeof grade.score === 'number'
        const isSelected = selectedStudentId === submission.student

        return (
          <button
            key={submission.id}
            type="button"
            onClick={() => onSelectStudent(submission.student, submission)}
            className={cn(
              'w-full rounded-[1.25rem] p-4 text-left transition-colors',
              isSelected
                ? 'bg-primary/8 ring-1 ring-primary/20'
                : 'bg-surface-container-lowest shadow-ambient hover:bg-surface-container-low',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {submission.studentName ?? submission.student}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {new Date(submission.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {isGraded ? (
                <Badge variant="success">{grade.score}分</Badge>
              ) : (
                <Badge variant="default">待批改</Badge>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
