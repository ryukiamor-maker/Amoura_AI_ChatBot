import { DefaultChatTransport } from 'ai'

import type { ChatLocale } from '../schema'
import type { ChatMessage } from '../types'

export function createApiChatTransport(locale: ChatLocale, apiEndpoint = '/api/chat') {
  return new DefaultChatTransport<ChatMessage>({
    api: apiEndpoint,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { locale, messages }
    })
  })
}
