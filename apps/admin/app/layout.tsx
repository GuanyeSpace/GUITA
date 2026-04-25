import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '归她 · 后台 CMS',
  description: '归她后台 CMS 工程骨架',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
