'use client'

import { MonitorUp } from 'lucide-react'
import { ClassroomLaunchPanel } from '@/components/classroom/classroom-launch-panel'
import { ClassroomControlPanel } from '@/components/classroom/classroom-control-panel'
import type { ClassroomSnapshotDTO } from '@/lib/dto/classroom'

type ClassroomConsoleDTO = {
  publishedLessons: Array<{
    id: string
    title: string
    publishedVersionId: string
    courseId: string
    classes: Array<{ id: string; name: string }>
  }>
  emptyStateCopy: string
}

export function ClassroomConsoleSurface({ consoleData, initialSnapshot }: { consoleData: ClassroomConsoleDTO; initialSnapshot: ClassroomSnapshotDTO | null }) {
  if (initialSnapshot) {
    return (
      <div className="space-y-5">
        <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-5 shadow-ambient sm:p-6 lg:hidden">
          <div className="flex items-center gap-3">
            <MonitorUp className="size-6 text-primary" aria-hidden />
            <p className="font-semibold">建议使用桌面端控课，当前为可读预览</p>
          </div>
        </section>
        <ClassroomControlPanel initialSnapshot={initialSnapshot} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ClassroomLaunchPanel publishedLessons={consoleData.publishedLessons} emptyStateCopy={consoleData.emptyStateCopy} />
    </div>
  )
}
