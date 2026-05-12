'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type {
  ClassroomLaunchPreviewDTO,
  ClassroomLaunchPreviewEmptyStateDTO,
} from '@/lib/dto/classroom'
import { BookMarked, Clock3, Sparkles } from 'lucide-react'

type ClassroomLaunchPreviewProps = {
  preview: ClassroomLaunchPreviewDTO | null
  emptyState: ClassroomLaunchPreviewEmptyStateDTO
}

export function ClassroomLaunchPreview({ preview, emptyState }: ClassroomLaunchPreviewProps) {
  if (!preview) {
    return (
      <Card className="bg-surface-container-low p-5 sm:p-6">
        <Badge variant="default" className="mb-4 bg-surface-container-lowest">课堂节奏预览</Badge>
        <div className="rounded-[1.5rem] bg-surface-container-lowest p-5 shadow-ambient">
          <div className="flex items-center gap-3 text-primary">
            <span className="rounded-full bg-surface-container-low p-2">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <p className="text-sm font-medium">选择课时后即时生成</p>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-on-surface">{emptyState.title}</h3>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{emptyState.description}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-surface-container-low p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="default" className="mb-4 bg-surface-container-lowest">课堂节奏预览</Badge>
          <h3 className="text-xl font-semibold text-on-surface">{preview.lessonTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            开课后将按下列顺序推进，帮助你在启动前确认讲授、互动与测验节奏。
          </p>
          <p className="mt-3 rounded-[1rem] bg-surface-container-lowest px-4 py-3 text-sm leading-6 text-on-surface-variant">
            课堂仍会按已发布快照启动，本期不会因为默认推断而阻断开课。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[18rem]">
          <PreviewMetric label="预计总时长" value={`${preview.totalEstimatedMinutes} 分钟`} icon={<Clock3 className="size-4 text-primary" aria-hidden />} />
          <PreviewMetric label="步骤数量" value={`${preview.stepCount} 个环节`} icon={<BookMarked className="size-4 text-primary" aria-hidden />} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {preview.steps.map((step) => (
          <article
            key={step.id}
            className="rounded-[1.5rem] bg-surface-container-lowest p-4 shadow-ambient sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-sm font-semibold text-primary">
                  {step.order}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-on-surface">{step.title}</h4>
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
                      {step.family}
                    </span>
                    <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant">
                      预计 {step.estimatedMinutes} 分钟
                    </span>
                    {step.teachingDesignStatus !== 'explicit' ? (
                      <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
                        默认推断
                      </span>
                    ) : null}
                    {step.needsTeachingDesignRefinement ? (
                      <span className="rounded-full bg-[#fff4cc] px-3 py-1 text-xs font-semibold text-[#8a6200]">
                        待完善
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">{step.summary}</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.evidenceSummary}</p>
                </div>
              </div>
            </div>

            {step.materialCues.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {step.materialCues.map((cue) => (
                  <span
                    key={`${step.id}-${cue}`}
                    className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface-variant"
                  >
                    材料：{cue}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </Card>
  )
}

function PreviewMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-lowest p-4 shadow-ambient">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-[1.1rem] font-semibold text-on-surface">{value}</p>
    </div>
  )
}
