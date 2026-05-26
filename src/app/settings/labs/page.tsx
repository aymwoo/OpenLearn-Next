import { Suspense } from 'react'

import { SettingsSurface } from '@/components/surfaces/settings-surface'

export default async function SettingsLabsPage({
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SettingsSurface mode="labs" />
    </Suspense>
  )
}
