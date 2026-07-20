import { notFound } from 'next/navigation'

import { ConfigWorkbench } from '@/components/ConfigWorkbench'
import { readChatbotConfig } from '@/lib/config-server'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <ConfigWorkbench apiKeyConfigured={Boolean(process.env.DEEPSEEK_API_KEY || process.env.CHATBOT_API_KEY)} initialConfig={await readChatbotConfig()} />
}
