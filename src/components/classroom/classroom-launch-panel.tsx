'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { launchClassroomSessionAction } from '@/actions/classroom-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ClassroomLaunchPanel({ publishedLessons, emptyStateCopy }: { publishedLessons: any[], emptyStateCopy: string }) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>('')
  const router = useRouter()

  const selectedLesson = publishedLessons.find(l => l.id === selectedLessonId)

  const handleLaunch = () => {
    if (!selectedLessonId || !selectedClassId) return
    setError('')
    startTransition(async () => {
      const formData = new FormData()
      formData.append('lessonId', selectedLessonId)
      formData.append('publishedVersionId', selectedLesson!.publishedVersionId)
      formData.append('classId', selectedClassId)
      
      const result = await launchClassroomSessionAction(formData)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  if (publishedLessons.length === 0) {
    return (
      <Card className="bg-surface-container-lowest p-6">
        <h2 className="text-2xl font-semibold mb-4">{emptyStateCopy}</h2>
        <p className="mt-2 text-on-surface-variant">请先在编辑器发布至少一个课时。</p>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-lowest p-6">
      <h2 className="text-2xl font-semibold mb-4">开始课堂</h2>
      <p className="mb-4 text-on-surface-variant">选择一个已发布课时并添加学生名单后，就可以开始实时课堂。</p>
      {error && <div className="mb-4 text-destructive font-semibold">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">选择课时</label>
          <select 
            className="w-full min-h-[44px] rounded-md border bg-surface-container-low p-2"
            value={selectedLessonId}
            onChange={e => {
              setSelectedLessonId(e.target.value)
              setSelectedClassId('')
            }}
            disabled={isPending}
          >
            <option value="">-- 选择已发布课时 --</option>
            {publishedLessons.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>
        {selectedLesson && (
          <div>
            <label className="block text-sm mb-1">选择班级</label>
            <select 
              className="w-full min-h-[44px] rounded-md border bg-surface-container-low p-2"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              disabled={isPending}
            >
              <option value="">-- 选择名单 --</option>
              {selectedLesson.classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button 
          onClick={handleLaunch} 
          disabled={!selectedLessonId || !selectedClassId || isPending}
          className="min-h-[48px] w-full"
        >
          {isPending ? "正在创建课堂，请稍候。" : "开始课堂"}
        </Button>
      </div>
    </Card>
  )
}
