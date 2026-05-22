import { Suspense } from 'react'

import { SettingsSurface } from '@/components/surfaces/settings-surface'

type SettingsLabsPageSearchParams = {
  commandId?: string;
}

export default async function SettingsLabsPage({
  searchParams,
}: {
  searchParams?: Promise<SettingsLabsPageSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <Suspense fallback={null}>
      <SettingsSurface
        mode="labs"
        selectedCommandId={resolvedSearchParams.commandId ?? null}
      />
    </Suspense>
  )
}
