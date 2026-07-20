import {
  createDeepSeek,
  type DeepSeekLanguageModelOptions
} from '@ai-sdk/deepseek'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  streamText,
  type InferUIMessageChunk
} from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { chatLocaleSchema } from '@/chatbot/schema'
import type { ChatMessage, MockToolPlan } from '@/chatbot/types'
import { createMockResponsePlan } from '@/chatbot/mock/createMockResponsePlan'
import { buildSystemPrompt, createChatTools } from '@/lib/chat-server'
import { readChatbotConfig } from '@/lib/config-server'
import { chatbotRateLimiter, getClientIp, isSameOriginRequest } from '@/lib/request-security'

const requestSchema = z.object({
  locale: chatLocaleSchema.default('en'),
  messages: z.array(z.unknown()).min(1).max(40)
})

function latestUserText(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim() || ''
}

function toolChunks(plan: MockToolPlan, callId: string): InferUIMessageChunk<ChatMessage>[] {
  return [
    { toolCallId: callId, toolName: plan.name, type: 'tool-input-start' },
    { input: plan.input, toolCallId: callId, toolName: plan.name, type: 'tool-input-available' },
    { output: plan.output, toolCallId: callId, type: 'tool-output-available' }
  ]
}

function mockResponse(messages: ChatMessage[], locale: 'en' | 'zh', config: Awaited<ReturnType<typeof readChatbotConfig>>) {
  const plan = createMockResponsePlan(latestUserText(messages), locale, config)
  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID()
      writer.write({ id: textId, type: 'text-start' })
      const fragments = locale === 'zh' ? Array.from(plan.text) : plan.text.split(/(\s+)/).filter(Boolean)
      for (const fragment of fragments) {
        writer.write({ delta: fragment, id: textId, type: 'text-delta' })
        await new Promise((resolve) => setTimeout(resolve, 14))
      }
      writer.write({ id: textId, type: 'text-end' })
      if (plan.tool) {
        for (const chunk of toolChunks(plan.tool, crypto.randomUUID())) writer.write(chunk)
      }
    },
    onError: () => 'The mock response could not be generated.'
  })
  return createUIMessageStreamResponse({ stream })
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Same-origin request required.' }, { status: 403 })
  }
  const rate = chatbotRateLimiter.consume(getClientIp(request))
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, {
      headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      status: 429
    })
  }

  try {
    const body = requestSchema.parse(await request.json())
    const config = await readChatbotConfig()
    const tools = createChatTools(config)
    const validated = await safeValidateUIMessages<ChatMessage>({ messages: body.messages, tools })
    if (!validated.success) {
      return NextResponse.json({ error: 'The chat messages are invalid.' }, { status: 400 })
    }
    const messages = validated.data
    const userText = latestUserText(messages)
    if (!userText || userText.length > 4000) {
      return NextResponse.json({ error: 'The message must contain between 1 and 4,000 characters.' }, { status: 400 })
    }

    if (config.mode === 'mock') return mockResponse(messages, body.locale, config)

    const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.CHATBOT_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Live mode requires DEEPSEEK_API_KEY on the server.' }, { status: 503 })
    }
    const provider = createDeepSeek({
      apiKey,
      baseURL: config.api.baseURL
    })
    const result = streamText({
      abortSignal: request.signal,
      model: provider(process.env.DEEPSEEK_MODEL?.trim() || config.api.model),
      messages: await convertToModelMessages(messages),
      providerOptions: {
        deepseek: {
          thinking: { type: 'disabled' }
        } satisfies DeepSeekLanguageModelOptions
      },
      stopWhen: isStepCount(3),
      system: buildSystemPrompt(config, body.locale),
      temperature: 0.25,
      tools
    })
    return result.toUIMessageStreamResponse({
      onError: () => 'The live provider failed to complete this response.'
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof z.ZodError ? 'The request body is invalid.' : 'The chat request could not be completed.'
    }, { status: error instanceof z.ZodError ? 400 : 500 })
  }
}
