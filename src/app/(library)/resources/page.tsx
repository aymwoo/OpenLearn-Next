import { LibrarySurface } from '@/components/surfaces/library-surface'
import { getTeacherResourceLibraryDTO } from '@/lib/dal/resources'

export default async function ResourcesPage() {
  const resources = await getTeacherResourceLibraryDTO()

  return <LibrarySurface mode="resources" resources={resources} />
}
