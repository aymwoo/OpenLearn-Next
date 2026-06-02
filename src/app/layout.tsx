import { Suspense } from 'react'
import type { Metadata } from 'next'
import '@fontsource/lexend/index.css'
import './globals.css'

import { ThemeInjector } from '@/components/theme/theme-injector'
import { ToastProvider } from '@/components/ui/toast'

export const metadata: Metadata = {
  title: 'OpenLearn Next',
  description: '面向未来教育的 AI 原生开源课堂操作系统',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <Suspense fallback={null}>
            <ThemeInjector />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
