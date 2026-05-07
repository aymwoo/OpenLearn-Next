import { Suspense } from 'react'

import { SettingsSurface } from '@/components/surfaces/settings-surface'

export default function SettingsLabsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsSurface mode="labs" />
    </Suspense>
  )
}
