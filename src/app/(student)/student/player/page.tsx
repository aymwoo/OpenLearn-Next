import { Suspense } from 'react'

import {
  PlayerPersonalFallback,
  PlayerPersonalRegion,
  PlayerSurface,
} from '@/components/surfaces/player-surface'
import {
  getStudentDashboardDTO,
  getStudentPlayerPersonalDTO,
  getStudentPlayerShellDTO,
} from '@/lib/dal/learning'
import type { StudentPlayerShellDTO } from '@/lib/dto/learning'

type StudentPlayerPageProps = {
  searchParams?: Promise<{
    lessonId?: string
    stepId?: string
  }>
}

async function PlayerPersonalLoader({
  lessonId,
  selectedStepId,
  shell,
}: {
  lessonId: string
  selectedStepId: string | null
  shell: StudentPlayerShellDTO
}) {
  const personal = await getStudentPlayerPersonalDTO({ lessonId, selectedStepId, forcedStepId: null })

  return <PlayerPersonalRegion shell={shell} personal={personal} />
}

export default async function StudentPlayerPage({ searchParams }: StudentPlayerPageProps) {
  const params = await searchParams
  let shell = null

  try {
    const dashboard = await getStudentDashboardDTO()
    const lessonId = params?.lessonId ?? dashboard.lessons[0]?.lessonId
    shell = lessonId ? await getStudentPlayerShellDTO({ lessonId }) : null
  } catch {
    shell = null
  }

  return (
    <PlayerSurface
      shell={shell}
      personalSlot={
        shell ? (
          <Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
            <PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} />
          </Suspense>
        ) : null
      }
    />
  )
}
