import { Suspense } from 'react'

import {
  assertStudentCanOpenPlayer,
  getStudentDashboardDTO,
  getStudentPlayerPersonalDTO,
  getStudentPlayerShellDTO,
} from '@/features/runtime-platform/player'
import {
  PlayerPersonalFallback,
  PlayerPersonalRegion,
  PlayerSurface,
} from '@/components/surfaces/player-surface'
import { ClassroomRuntimeClient } from '@/components/learning/classroom-runtime-client'
import type { StudentPlayerShellDTO } from '@/lib/dto/learning'

type StudentPlayerScope = Awaited<ReturnType<typeof assertStudentCanOpenPlayer>>

type StudentPlayerPageProps = {
  searchParams?: Promise<{
    lessonId?: string
    stepId?: string
  }>
}

const INACCESSIBLE_LESSON_MESSAGE = "课时暂不可学习"

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

  return <ClassroomRuntimeClient shell={shell} personal={personal} />
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
  } catch (error) {
    if (error instanceof Error && error.message === INACCESSIBLE_LESSON_MESSAGE) {
      shell = null
      scope = null
    } else {
      throw error
    }
  }

  return (
    <PlayerSurface
      shell={shell}
      personalSlot={
        shell && scope ? (
          <PlayerPersonalRegion
            player={null}
            personalSlot={
              <Suspense fallback={<PlayerPersonalFallback shell={shell} />}>
                <PlayerPersonalLoader lessonId={shell.lessonId} selectedStepId={params?.stepId ?? null} shell={shell} scope={scope} />
              </Suspense>
            }
          />
        ) : null
      }
    />
  )
}
