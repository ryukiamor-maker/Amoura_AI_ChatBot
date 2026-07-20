import { PreviewExperience } from '@/components/PreviewExperience'
import { readChatbotConfig } from '@/lib/config-server'

export const dynamic = 'force-dynamic'

export default async function PreviewPage() {
  return <PreviewExperience canConfigure={process.env.NODE_ENV === 'development'} config={await readChatbotConfig()} />
}
