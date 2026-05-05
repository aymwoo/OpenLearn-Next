import { PlayerSurface } from '@/components/surfaces/player-surface'
import { getStudentDashboardDTO, getStudentPlayerDTO } from '@/lib/dal/learning'

type StudentPlayerPageProps = {
  searchParams?: Promise<{
    lessonId?: string
    stepId?: string
  }>
}

export default async function StudentPlayerPage({ searchParams }: StudentPlayerPageProps) {
  const params = await searchParams
  let player = null

  try {
    const dashboard = await getStudentDashboardDTO()
    const lessonId = params?.lessonId ?? dashboard.lessons[0]?.lessonId
    player = lessonId
      ? await getStudentPlayerDTO({ lessonId, selectedStepId: params?.stepId ?? null, forcedStepId: null })
      : null
  } catch {
    player = null
  }

  return <PlayerSurface player={player} />
}
