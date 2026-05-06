import { Activity, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export function ClassroomRosterPanel({ participants }: { participants: any[] }) {
  const connectedCount = participants.filter((participant) => participant.connectionState === 'connected').length

  return (
    <Card className="bg-surface-container-lowest p-5 shadow-[0_16px_40px_rgba(44,47,49,0.05)] sm:p-6">
      <div className="flex items-center gap-3">
        <UsersRound className="size-6 text-primary" aria-hidden />
        <h2 className="text-2xl font-semibold">学生状态</h2>
      </div>

      <div className="mt-5 rounded-[1.4rem] bg-surface-container-low px-4 py-4">
        <p className="text-sm text-on-surface-variant">出勤概况</p>
        <p className="mt-2 text-[1.75rem] font-semibold text-on-surface">{connectedCount} / {participants.length}</p>
        <p className="mt-1 text-sm text-on-surface-variant">在线学生已同步到当前课堂状态。</p>
      </div>

      <div className="mt-5 space-y-3">
        {participants.map((participant) => (
          <div key={participant.studentId} className="rounded-3xl bg-surface-container-low p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{participant.studentName}</p>
              <Badge variant={participant.connectionState === 'connected' ? 'success' : 'default'}>
                {participant.connectionState === 'connected' ? '已跟随' : '未连接'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">最近可见：{new Date(participant.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-3xl bg-surface-container-low p-5">
        <Activity className="mb-3 size-6 text-primary" aria-hidden />
        <p className="font-semibold">课堂节奏稳定</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">继续观察需关注学生，再进入练习环节。</p>
      </div>
    </Card>
  )
}
