import { Suspense } from 'react'

import { PluginMarketplaceSurface } from '@/components/surfaces/plugin-marketplace-surface'

export default function SettingsPluginsPage() {
  return (
    <Suspense fallback={null}>
      <PluginMarketplaceSurface />
    </Suspense>
  )
}
