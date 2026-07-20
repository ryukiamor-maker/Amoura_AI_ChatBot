import { beforeEach, describe, expect, it } from 'vitest'

import { clearChatSession, readSessionDraft, readSessionMessages, writeSessionDraft, writeSessionMessages } from '@/chatbot/session'
import type { ChatMessage } from '@/chatbot/types'

describe('page-session memory', () => {
  beforeEach(() => clearChatSession())

  it('keeps a draft and messages while the page module remains alive', () => {
    const messages = [{ id: 'one', metadata: { createdAt: 'now' }, parts: [{ text: 'Hello', type: 'text' }], role: 'user' }] as ChatMessage[]
    writeSessionDraft('unfinished', 'en')
    writeSessionMessages(messages, 'en')
    expect(readSessionDraft('en')).toBe('unfinished')
    expect(readSessionMessages('en')).toEqual(messages)
  })

  it('keeps locales independent', () => {
    writeSessionDraft('hello', 'en'); writeSessionDraft('你好', 'zh'); clearChatSession('en')
    expect(readSessionDraft('en')).toBe('')
    expect(readSessionDraft('zh')).toBe('你好')
  })
})
