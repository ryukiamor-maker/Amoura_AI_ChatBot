import { NextResponse } from 'next/server'

import { readChatbotConfig, writeChatbotConfig } from '@/lib/config-server'
import { isSameOriginRequest } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({
      apiKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY || process.env.CHATBOT_API_KEY),
      config: await readChatbotConfig()
    })
  } catch {
    return NextResponse.json({ error: 'Unable to read the chatbot configuration.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Configuration writes are disabled outside development.' }, { status: 404 })
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Same-origin request required.' }, { status: 403 })
  }

  try {
    const config = await writeChatbotConfig(await request.json())
    return NextResponse.json({ config, saved: true })
  } catch (error) {
    const message = error instanceof Error && error.name === 'ZodError'
      ? 'The configuration did not pass validation.'
      : 'Unable to save the configuration.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
