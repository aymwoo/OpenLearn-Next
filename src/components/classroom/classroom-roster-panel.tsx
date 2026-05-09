import { Activity, UsersRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ClassroomParticipantDTO } from '@/lib/dto/classroom'

export function ClassroomRosterPanel({ participants }: { participants: ClassroomParticipantDTO[] }) {
  const connectedCount = participants.filter((participant) => participant.connectionState === 'connected').length
  const reconnectingCount = participants.filter((participant) => participant.connectionState === 'reconnecting').length
  const offlineCount = participants.length - connectedCount - reconnectingCount

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UsersRound className="size-6 text-primary" aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold">学生状态</h2>
            <p className="mt-1 text-sm text-on-surface-variant">课堂名册与在线状态同步</p>
          </div>
        </div>
        <Badge variant="accent">课堂名册</Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <RosterMetric label="已连接" value={`${connectedCount}`} detail={`共 ${participants.length} 人`} />
        <RosterMetric label="重连中" value={`${reconnectingCount}`} detail="等待学生端恢复" />
        <RosterMetric label="离线" value={`${offlineCount}`} detail="优先关注这些学生" />
      </div>

      <div className="mt-5 grid gap-3">
        {participants.map((participant) => {
          const badgeLabel = participant.connectionState === 'connected' ? '已跟随' : participant.connectionState === 'reconnecting' ? '重连中' : '未连接'
          return (
            <article key={participant.studentId} className="rounded-[1.35rem] bg-surface-container-lowest p-4 shadow-ambient">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-on-surface">{participant.studentName}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">最近可见：{new Date(participant.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge variant={participant.connectionState === 'connected' ? 'success' : 'default'}>{badgeLabel}</Badge>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-5 rounded-[1.4rem] bg-surface-container-lowest p-5 shadow-ambient">
        <Activity className="mb-3 size-6 text-primary" aria-hidden />
        <p className="font-semibold">课堂节奏提示</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">如果未连接学生持续较多，建议在进入练习或测验前先做一次点名确认。</p>
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
