import { NextResponse } from 'next/server'

import { readChatbotConfig, writeChatbotConfig } from '@/lib/config-server'
import { isSameOriginRequest } from '@/lib/request-security'

export const dynamic = 'force-dynamic'
const noStoreHeaders = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  try {
    return NextResponse.json({
      apiKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY || process.env.CHATBOT_API_KEY),
      config: await readChatbotConfig()
    }, { headers: noStoreHeaders })
  } catch {
    return NextResponse.json({ error: 'Unable to read the chatbot configuration.' }, { headers: noStoreHeaders, status: 500 })
  }
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Configuration writes are disabled outside development.' }, { headers: noStoreHeaders, status: 404 })
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Same-origin request required.' }, { headers: noStoreHeaders, status: 403 })
  }

  try {
    const config = await writeChatbotConfig(await request.json())
    return NextResponse.json({ config, saved: true }, { headers: noStoreHeaders })
  } catch (error) {
    const message = error instanceof Error && error.name === 'ZodError'
      ? 'The configuration did not pass validation.'
      : 'Unable to save the configuration.'
    return NextResponse.json({ error: message }, { headers: noStoreHeaders, status: 400 })
  }
}
