import { Suspense } from 'react'

import { SettingsSurface } from '@/components/surfaces/settings-surface'

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsSurface mode="general" />
    </Suspense>
  )
}
