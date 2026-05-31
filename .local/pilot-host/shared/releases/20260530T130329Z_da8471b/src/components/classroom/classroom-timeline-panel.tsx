'use client'

import { MessageSquareQuote, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ClassroomTeacherTimelineEntryDTO } from '@/lib/dto/classroom'

function formatTimelineTime(value: string) {
  const date = new Date(value)

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}

function getScopeLabel(entry: ClassroomTeacherTimelineEntryDTO) {
  return entry.targetScope === 'student' ? '目标学生' : '目标范围'
}

function getScopeValue(entry: ClassroomTeacherTimelineEntryDTO) {
  return entry.targetScope === 'student' ? entry.targetLabel : '全班'
}

export function ClassroomTimelinePanel({
  entries,
}: {
  entries: ClassroomTeacherTimelineEntryDTO[]
}) {
  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MessageSquareQuote className="size-6 text-primary" aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold">干预记录时间线</h2>
            <p className="mt-1 text-sm text-on-surface-variant">仅教师可见的课堂过程记录</p>
          </div>
        </div>
        <Badge variant="accent">{entries.length} 条记录</Badge>
      </div>

      {entries.length === 0 ? (
        <div className="mt-5 rounded-[1.4rem] bg-surface-container-lowest p-5 shadow-ambient">
          <p className="font-semibold text-on-surface">还没有干预记录</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            当你在课堂中记录提醒、点名纠偏或过程性干预后，这里会按时间线展示标题、正文、目标范围与记录时间。
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[1.4rem] bg-surface-container-lowest p-4 shadow-ambient"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-on-surface">{entry.title}</p>
                    <Badge variant="default">教师记录</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-on-surface-variant">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-on-surface">{getScopeLabel(entry)}</span>
                      <span>{getScopeValue(entry)}</span>
                      {entry.stepTitle ? <span>· {entry.stepTitle}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" aria-hidden />
                      <span>{formatTimelineTime(entry.createdAt)} 记录</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.1rem] bg-surface-container-low p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-on-surface-variant">
                  {entry.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
