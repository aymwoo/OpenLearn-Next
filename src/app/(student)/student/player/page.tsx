import { Suspense } from 'react'

import {
  PlayerPersonalFallback,
  PlayerPersonalRegion,
  PlayerSurface,
} from '@/components/surfaces/player-surface'
import {
  getStudentDashboardDTO,
  assertStudentCanOpenPlayer,
  getStudentPlayerPersonalDTO,
  getStudentPlayerShellDTO,
} from '@/lib/dal/learning'
import type { StudentPlayerShellDTO } from '@/lib/dto/learning'

type StudentPlayerScope = Awaited<ReturnType<typeof assertStudentCanOpenPlayer>>

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
  scope,
}: {
  lessonId: string
  selectedStepId: string | null
  shell: StudentPlayerShellDTO
  scope: StudentPlayerScope
}) {
  const personal = await getStudentPlayerPersonalDTO({ lessonId, selectedStepId, forcedStepId: null, scope })

  return <PlayerPersonalRegion shell={shell} personal={personal} />
}

export default async function StudentPlayerPage({ searchParams }: StudentPlayerPageProps) {
  const params = await searchParams
  let shell: StudentPlayerShellDTO | null = null
  let scope: StudentPlayerScope | null = null

  try {
    const dashboard = await getStudentDashboardDTO()
    const lessonId = params?.lessonId ?? dashboard.lessons[0]?.lessonId

    if (lessonId) {
      scope = await assertStudentCanOpenPlayer({ lessonId })
      shell = await getStudentPlayerShellDTO({ lessonId, scope })
    }
  } catch {
    shell = null
    scope = null
  }

  return (
    <PlayerSurface
      shell={shell}
      personalSlot={
        shell && scope ? (
          <Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
            <PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} scope={scope} />
          </Suspense>
        ) : null
      }
    />
  )
}
