'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { refreshClassroomSnapshotAction } from '@/actions/classroom-actions'

export function ClassroomConflictPanel({ 
  sessionId, 
  onRefresh
}: { 
  sessionId: string;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRefresh = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      await refreshClassroomSnapshotAction(formData)
      router.refresh()
      onRefresh()
    })
  }

  return (
    <Card className="bg-[#fff3cd] text-[#856404] p-5 sm:p-6 shadow-ambient mb-5" aria-live="polite">
      <h2 className="text-xl font-semibold mb-2">课堂状态已经被更新。请先恢复最新状态，再继续操作。</h2>
      <p className="mb-4">当前控课面板可能不是最新。已为你保留本次操作，请刷新课堂快照后确认。</p>
      <Button 
        onClick={handleRefresh}
        disabled={isPending}
        className="min-h-[44px] bg-[#856404] text-white hover:bg-[#856404]/90"
      >
        刷新课堂快照
      </Button>
    </Card>
  )
}
