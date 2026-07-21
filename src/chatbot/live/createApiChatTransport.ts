import { DefaultChatTransport } from 'ai'

import { withBasePath } from '@/lib/base-path'
import type { ChatLocale } from '../schema'
import type { ChatMessage } from '../types'

export function createApiChatTransport(locale: ChatLocale, apiEndpoint = withBasePath('/api/chat')) {
  return new DefaultChatTransport<ChatMessage>({
    api: apiEndpoint,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { locale, messages }
    })
  })
}
