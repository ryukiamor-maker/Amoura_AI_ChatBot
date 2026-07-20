import { createDeepSeek } from '@ai-sdk/deepseek'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { chatbotConfigSchema } from '@/chatbot/schema'
import { isSameOriginRequest } from '@/lib/request-security'

const requestSchema = chatbotConfigSchema.pick({ api: true })

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Connection testing is available in development only.' }, { status: 404 })
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Same-origin request required.' }, { status: 403 })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.CHATBOT_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ configured: false, error: 'DEEPSEEK_API_KEY is not configured.' }, { status: 400 })
  }

  try {
    const { api } = requestSchema.parse(await request.json())
    const provider = createDeepSeek({
      apiKey,
      baseURL: api.baseURL
    })
    const startedAt = Date.now()
    await generateText({
      maxOutputTokens: 8,
      model: provider(api.model),
      prompt: 'Reply with OK.',
      timeout: 12_000
    })
    return NextResponse.json({ configured: true, latencyMs: Date.now() - startedAt, ok: true })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 502
    return NextResponse.json({
      configured: true,
      error: status === 400 ? 'The API settings are invalid.' : 'The provider connection failed. Check the URL, model, and server-side key.',
      ok: false
    }, { status })
  }
}
