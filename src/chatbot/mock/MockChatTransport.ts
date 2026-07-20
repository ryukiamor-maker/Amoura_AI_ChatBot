import type { ChatTransport, UIMessageChunk } from 'ai'

import type { ChatbotConfig, ChatLocale } from '../schema'
import type { ChatMessage, MockToolPlan } from '../types'
import { createMockResponsePlan } from './createMockResponsePlan'

function createId(prefix: string) {
  const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${value}`
}

function latestUserText(messages: ChatMessage[]) {
  const message = [...messages].reverse().find((item) => item.role === 'user')
  return message?.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim() || ''
}

function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)
    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Mock response stopped.', 'AbortError'))
    }
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
}

function toolChunks(toolPlan: MockToolPlan): UIMessageChunk[] {
  const toolCallId = createId('tool')
  return [
    { toolCallId, toolName: toolPlan.name, type: 'tool-input-start' },
    { input: toolPlan.input, toolCallId, toolName: toolPlan.name, type: 'tool-input-available' },
    { output: toolPlan.output, toolCallId, type: 'tool-output-available' }
  ]
}

export class MockChatTransport implements ChatTransport<ChatMessage> {
  constructor(
    private readonly config: ChatbotConfig,
    private readonly locale: ChatLocale,
    private readonly fragmentDelayMs = 18
  ) {}

  async sendMessages({ abortSignal, messages }: Parameters<ChatTransport<ChatMessage>['sendMessages']>[0]) {
    const plan = createMockResponsePlan(latestUserText(messages), this.locale, this.config)
    const responseId = createId('assistant')
    const textId = createId('text')
    const fragments = this.locale === 'zh'
      ? Array.from(plan.text)
      : plan.text.split(/(\s+)/).filter(Boolean)
    const delay = this.fragmentDelayMs

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        try {
          controller.enqueue({ messageId: responseId, type: 'start' })
          controller.enqueue({ id: textId, type: 'text-start' })
          for (const fragment of fragments) {
            if (abortSignal?.aborted) throw new DOMException('Stopped', 'AbortError')
            controller.enqueue({ delta: fragment, id: textId, type: 'text-delta' })
            await wait(delay, abortSignal)
          }
          controller.enqueue({ id: textId, type: 'text-end' })
          if (plan.tool) {
            for (const chunk of toolChunks(plan.tool)) {
              controller.enqueue(chunk)
              await wait(Math.min(delay * 2, 60), abortSignal)
            }
          }
          controller.enqueue({ finishReason: 'stop', type: 'finish' })
          controller.close()
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            controller.enqueue({ reason: 'user-stopped', type: 'abort' })
            controller.close()
            return
          }
          controller.error(error)
        }
      }
    })
  }

  async reconnectToStream() {
    return null
  }
}
