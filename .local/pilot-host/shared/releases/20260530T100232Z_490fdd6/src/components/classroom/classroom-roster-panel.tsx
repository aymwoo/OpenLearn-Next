import { Activity, UsersRound } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ClassroomParticipantMonitoringDTO, ClassroomRosterSummaryDTO, ClassroomVotingRoundDTO } from '@/lib/dto/classroom'

export function ClassroomRosterPanel({
  participants,
  monitoringSummary,
  currentVotingRound,
  sessionId,
}: {
  participants: ClassroomParticipantMonitoringDTO[]
  monitoringSummary: ClassroomRosterSummaryDTO
  currentVotingRound?: ClassroomVotingRoundDTO | null
  sessionId?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const openStudentDetail = (studentId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sessionId) {
      params.set('sessionId', sessionId)
    }
    params.set('studentId', studentId)
    params.set('detailTab', 'evidence')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UsersRound className="size-6 text-primary" aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold">学生状态</h2>
            <p className="mt-1 text-sm text-on-surface-variant">课堂名册、进度与课堂回应概览</p>
          </div>
        </div>
        <Badge variant="accent">课堂名册</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RosterMetric label="已连接" value={`${monitoringSummary.connectedCount}`} detail={`共 ${participants.length} 人`} />
        <RosterMetric label="重连中" value={`${monitoringSummary.reconnectingCount}`} detail="等待学生端恢复" />
        <RosterMetric label="需要关注" value={`${monitoringSummary.needsAttentionCount}`} detail="优先干预对象" />
        <RosterMetric label="已提交" value={`${monitoringSummary.submittedCount}`} detail="当前环节已有回应" />
      </div>

      <div className="mt-5 grid gap-3">
        {participants.map((participant) => {
          const badgeLabel = participant.needsAttention ? '需要关注' : '状态稳定'
          const connectionLabel = participant.connectionState === 'connected' ? '已跟随' : participant.connectionState === 'reconnecting' ? '重连中' : '未连接'
          return (
            <article key={participant.studentId} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface">{participant.studentName}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">最近可见：{new Date(participant.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                    <span className="rounded-full bg-surface-container-low px-3 py-1">{connectionLabel}</span>
                    <span className="rounded-full bg-surface-container-low px-3 py-1">{participant.progressLabel}</span>
                    <span className="rounded-full bg-surface-container-low px-3 py-1">{participant.submissionCount} 次回应</span>
                  </div>
                  {participant.attentionReasons.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {participant.attentionReasons.map((reason) => (
                        <span key={`${participant.studentId}-${reason}`} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-primary">
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <Button type="button" variant="secondary" className="min-h-[40px] px-4" onClick={() => openStudentDetail(participant.studentId)}>
                      查看证据与评价
                    </Button>
                  </div>
                </div>
                <Badge variant={participant.needsAttention ? 'default' : 'success'}>{badgeLabel}</Badge>
              </div>
            </article>
          )
        })}
      </div>

      {currentVotingRound ? (
        <div className="mt-5 rounded-[1.4rem] bg-surface-container-lowest p-5 shadow-ambient">
          <p className="text-sm font-semibold text-on-surface">未完成名单</p>
          {currentVotingRound.incompleteStudents.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {currentVotingRound.incompleteStudents.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between rounded-[1rem] bg-surface-container-low px-3 py-2 text-sm text-on-surface">
                  <span>{student.studentName}</span>
                  <span className="rounded-full bg-surface-container-lowest px-3 py-1 text-xs text-on-surface-variant">{student.statusToken}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">全班已提交，可由老师决定何时结束本轮投票。</p>
          )}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.4rem] bg-surface-container-lowest p-5 shadow-ambient">
        <Activity className="mb-3 size-6 text-primary" aria-hidden />
        <p className="font-semibold">课堂节奏提示</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">如果需要关注学生持续较多，建议先点名确认，再决定是否推进到练习或测验环节。</p>
      </div>
    </Card>
  )
}

function RosterMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-lowest p-4 shadow-ambient">
      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
      <p className="mt-2 text-[1.6rem] font-semibold text-on-surface">{value}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{detail}</p>
    </div>
  )
}
