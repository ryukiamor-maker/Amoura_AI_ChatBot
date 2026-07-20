import type { Metadata } from 'next'
import { Manrope, Newsreader, Plus_Jakarta_Sans } from 'next/font/google'

import './globals.css'

const sans = Manrope({ subsets: ['latin'], variable: '--font-sans' })
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif' })
const launcher = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-launcher', weight: ['500'] })

export const metadata: Metadata = {
  description: 'A portable, mock-first AI chatbot component and local configuration workbench.',
  title: 'Amoura Chatbot Kit'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${launcher.variable}`}>{children}</body>
    </html>
  )
}
