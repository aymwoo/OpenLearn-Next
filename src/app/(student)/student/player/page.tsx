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
  const dashboard = await getStudentDashboardDTO()
  const lessonId = params?.lessonId ?? dashboard.lessons[0]?.lessonId
  const player = lessonId
    ? await getStudentPlayerDTO({ lessonId, selectedStepId: params?.stepId ?? null, forcedStepId: null })
    : null

  return <PlayerSurface player={player} />
}
