'use client'

import { useState } from 'react'
import { rolePreviewItems } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

export function RolePreview() {
  const [activeRole, setActiveRole] = useState<(typeof rolePreviewItems)[number]['label']>('教师')
  const active = rolePreviewItems.find((item) => item.label === activeRole) ?? rolePreviewItems[0]

  return (
    <section className="rounded-[var(--radius-shell)] bg-surface-container-low p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">角色预览</p>
          <h2 className="text-2xl font-semibold">{active.label}视角</h2>
        </div>
        <p className="max-w-56 text-sm text-on-surface-variant">仅切换当前页面的演示视角，不代表登录状态</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rolePreviewItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setActiveRole(item.label)}
            className={cn(
              'min-h-11 rounded-full px-4 text-sm transition',
              activeRole === item.label ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-4 rounded-3xl bg-surface-container-lowest p-4 text-sm text-on-surface-variant">{active.description}</p>
    </section>
  )
}
