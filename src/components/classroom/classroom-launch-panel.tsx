'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { launchClassroomSessionAction } from '@/actions/classroom-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ghostSelectFieldClassName } from '@/components/ui/ghost-field'
import { BookOpen, Users } from 'lucide-react'

type PublishedLessonOption = {
  id: string
  title: string
  publishedVersionId: string
  courseId: string
  classes: Array<{ id: string; name: string }>
}

export function ClassroomLaunchPanel({ publishedLessons, emptyStateCopy }: { publishedLessons: PublishedLessonOption[], emptyStateCopy: string }) {
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
    <Card className="bg-surface-container-lowest p-6 sm:p-7">
      <div className="rounded-[1.5rem] bg-surface-container-low p-5">
        <Badge variant="accent" className="mb-4">课堂预备区</Badge>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">开始课堂</h2>
            <p className="mt-3 max-w-2xl text-on-surface-variant">选择一个已发布课时并指定班级名单后，即可进入实时课堂运行台。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem]">
            <MetricTile icon={<BookOpen className="size-4 text-primary" />} label="已发布课时" value={String(publishedLessons.length)} />
            <MetricTile icon={<Users className="size-4 text-primary" />} label="可用班级" value={selectedLesson ? String(selectedLesson.classes.length) : '--'} />
          </div>
        </div>
      </div>

      {error && <div className="mt-5 rounded-[1.25rem] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}

      <div className="mt-5 space-y-4 rounded-[1.5rem] bg-surface-container-low p-5">
        <div className="grid gap-2">
          <label className="text-sm text-on-surface-variant">选择课时</label>
          <select 
            className={ghostSelectFieldClassName}
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
          <div className="grid gap-2">
            <label className="text-sm text-on-surface-variant">选择班级</label>
            <select 
              className={ghostSelectFieldClassName}
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              disabled={isPending}
            >
              <option value="">-- 选择名单 --</option>
              {selectedLesson.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button 
          onClick={handleLaunch} 
          disabled={!selectedLessonId || !selectedClassId || isPending}
          className="min-h-[52px] w-full text-base"
        >
          {isPending ? "正在创建课堂，请稍候。" : "开始课堂"}
        </Button>
      </div>
    </Card>
  )
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-lowest p-4 shadow-ambient">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-[1.6rem] font-semibold text-on-surface">{value}</p>
    </div>
  )
}
