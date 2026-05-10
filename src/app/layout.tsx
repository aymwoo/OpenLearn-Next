import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import './globals.css'

import { ThemeInjector } from '@/components/theme/theme-injector'

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' })

export const metadata: Metadata = {
  title: '开放学习 Next',
  description: '面向未来教育的 AI 原生开源课堂操作系统',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={lexend.variable}>
        <Suspense fallback={null}>
          <ThemeInjector />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
