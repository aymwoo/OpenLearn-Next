'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { launchClassroomSessionAction } from '@/actions/classroom-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users } from 'lucide-react'

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
      <Card className="bg-surface-container-lowest p-6 shadow-[0_16px_40px_rgba(44,47,49,0.05)]">
        <h2 className="text-2xl font-semibold mb-4">{emptyStateCopy}</h2>
        <p className="mt-2 text-on-surface-variant">请先在编辑器发布至少一个课时。</p>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-lowest p-6 shadow-[0_16px_40px_rgba(44,47,49,0.05)] sm:p-7">
      <Badge variant="accent" className="bg-surface-container-low mb-4">课堂预备区</Badge>
      <h2 className="mb-3 text-2xl font-semibold">开始课堂</h2>
      <p className="mb-5 text-on-surface-variant">选择一个已发布课时并指定班级名单后，即可进入实时课堂运行台。</p>
      {error && <div className="mb-4 text-destructive font-semibold">{error}</div>}

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <BookOpen className="size-4 text-primary" />
            已发布课时
          </div>
          <p className="mt-2 text-[1.6rem] font-semibold text-on-surface">{publishedLessons.length}</p>
        </div>
        <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Users className="size-4 text-primary" />
            可用班级
          </div>
          <p className="mt-2 text-[1.6rem] font-semibold text-on-surface">{selectedLesson ? selectedLesson.classes.length : '--'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-on-surface-variant">选择课时</label>
          <select 
            className="w-full min-h-[52px] rounded-[1.25rem] bg-surface-container-low px-4 outline-none transition focus-visible:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/20"
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
            <label className="mb-2 block text-sm text-on-surface-variant">选择班级</label>
            <select 
              className="w-full min-h-[52px] rounded-[1.25rem] bg-surface-container-low px-4 outline-none transition focus-visible:bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary/20"
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
          className="min-h-[52px] w-full"
        >
          {isPending ? "正在创建课堂，请稍候。" : "开始课堂"}
        </Button>
      </div>
    </Card>
  )
}
