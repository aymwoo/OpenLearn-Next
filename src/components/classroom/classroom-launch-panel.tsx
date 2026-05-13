'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { launchClassroomSessionAction } from '@/actions/classroom-actions'
import { ClassroomLaunchPreview } from '@/components/classroom/classroom-launch-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ghostSelectFieldClassName } from '@/components/ui/ghost-field'
import type {
  ClassroomLaunchLessonOptionDTO,
  ClassroomLaunchPreviewEmptyStateDTO,
} from '@/lib/dto/classroom'
import { AlertTriangle, BookOpen, CheckCircle2, TriangleAlert, Users } from 'lucide-react'

type ClassroomLaunchPanelProps = {
  publishedLessons: ClassroomLaunchLessonOptionDTO[]
  emptyStateCopy: string
  launchPreviewEmptyState: ClassroomLaunchPreviewEmptyStateDTO
  successHref?: string
  badgeLabel?: string
  title?: string
  description?: string
  ctaLabel?: string
}

export function ClassroomLaunchPanel({
  publishedLessons,
  emptyStateCopy,
  launchPreviewEmptyState,
  successHref,
  badgeLabel = '课堂预备区',
  title = '开启新课堂',
  description = '选择一个已发布课时并指定班级名单后，即可进入实时课堂运行台。',
  ctaLabel = '开启新课堂',
}: ClassroomLaunchPanelProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>('')
  const router = useRouter()

  const selectedLesson = publishedLessons.find(l => l.id === selectedLessonId)
  const selectedClass = selectedLesson?.classes.find((item) => item.id === selectedClassId) ?? null
  const launchableClasses = selectedLesson?.classes.filter((item) => item.studentCount > 0) ?? []

  const resolveLaunchTarget = (sessionId: string | undefined, fallbackHref: string | undefined) => {
    if (sessionId) {
      return `/classroom?sessionId=${encodeURIComponent(sessionId)}`
    }

    if (fallbackHref) {
      return fallbackHref
    }

    return null
  }

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
        const sessionId =
          result.data &&
          typeof result.data === 'object' &&
          'sessionId' in result.data &&
          typeof result.data.sessionId === 'string'
            ? result.data.sessionId
            : undefined
        const targetHref = resolveLaunchTarget(sessionId, successHref)

        if (targetHref) {
          router.push(targetHref)
          return
        }

        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  if (publishedLessons.length === 0) {
    return (
      <Card className="bg-surface-container-lowest p-6">
        <Badge variant="accent" className="mb-4">{badgeLabel}</Badge>
        <h2 className="mb-4 text-2xl font-semibold">{emptyStateCopy}</h2>
        <p className="mt-2 text-on-surface-variant">请先在编辑器发布至少一个课时。</p>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-lowest p-6 sm:p-7">
      <div className="rounded-[1.5rem] bg-surface-container-low p-5">
        <Badge variant="accent" className="mb-4">{badgeLabel}</Badge>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-3 max-w-2xl text-on-surface-variant">{description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem]">
            <MetricTile icon={<BookOpen className="size-4 text-primary" />} label="已发布课时" value={String(publishedLessons.length)} />
            <MetricTile icon={<Users className="size-4 text-primary" />} label="整班名册" value={selectedLesson ? String(launchableClasses.length) : '--'} />
          </div>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-[1.25rem] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-red-600">{error}</div> : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-[1.5rem] bg-surface-container-low p-5">
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
                <option value="">-- 选择整班名单 --</option>
                {launchableClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-[1.25rem] bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-on-surface-variant">整班摘要</p>
                <h3 className="mt-1 text-base font-semibold text-on-surface">
                  {selectedClass?.rosterSummary.className ?? '先选择班级'}
                </h3>
              </div>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
                {selectedClass ? `${selectedClass.studentCount} 人` : '整班启动'}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {selectedClass?.rosterSummary.note ?? '当前只支持整班启动；选择班级后会在这里展示名册规模与启动范围说明。'}
            </p>
          </div>

          <Button 
            onClick={handleLaunch} 
            disabled={!selectedLessonId || !selectedClassId || isPending}
            className="min-h-[52px] w-full text-base"
          >
            {isPending ? '正在创建课堂，请稍候。' : ctaLabel}
          </Button>
        </div>

        <div className="space-y-3 rounded-[1.5rem] bg-surface-container-low p-5">
          <div>
            <p className="text-sm text-on-surface-variant">readiness</p>
            <h3 className="mt-1 text-lg font-semibold text-on-surface">开课前准备分层</h3>
          </div>
          <ReadinessGroup
            title="阻断项"
            issues={selectedLesson?.launchReadiness.blockingIssues ?? []}
            emptyLabel="当前没有阻断项，可以继续选择整班并开启课堂。"
            icon={<AlertTriangle className="size-4" aria-hidden />}
            tone="blocking"
          />
          <ReadinessGroup
            title="需关注"
            issues={selectedLesson?.launchReadiness.attentionIssues ?? []}
            emptyLabel="当前没有需关注的问题。"
            icon={<TriangleAlert className="size-4" aria-hidden />}
            tone="attention"
          />
          <ReadinessGroup
            title="建议完善"
            issues={selectedLesson?.launchReadiness.advisoryIssues ?? []}
            emptyLabel="当前没有建议完善项。"
            icon={<CheckCircle2 className="size-4" aria-hidden />}
            tone="advisory"
          />
        </div>
      </div>

      <div className="mt-5">
        <ClassroomLaunchPreview
          preview={selectedLesson?.launchPreview ?? null}
          emptyState={launchPreviewEmptyState}
        />
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

function ReadinessGroup({
  title,
  issues,
  emptyLabel,
  icon,
  tone,
}: {
  title: string
  issues: Array<{ message: string }>
  emptyLabel: string
  icon: React.ReactNode
  tone: 'blocking' | 'attention' | 'advisory'
}) {
  const toneClassName = tone === 'blocking'
    ? 'bg-[#fff1f2] text-[#b31b25]'
    : tone === 'attention'
      ? 'bg-[#fff4cc] text-[#8a6200]'
      : 'bg-surface-container-high text-on-surface'

  return (
    <section className="rounded-[1.25rem] bg-surface-container-lowest p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <span className={`rounded-full p-2 ${toneClassName}`}>{icon}</span>
          {title}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClassName}`}>{issues.length} 项</span>
      </div>
      {issues.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label={title}>
          {issues.map((issue, index) => (
            <li key={`${title}-${index}`} className="rounded-[1rem] bg-surface-container-low px-3 py-3 text-sm leading-6 text-on-surface-variant">
              {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-[1rem] bg-surface-container-low px-3 py-3 text-sm leading-6 text-on-surface-variant">{emptyLabel}</p>
      )}
    </section>
  )
}
