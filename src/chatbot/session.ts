import type { ChatLocale } from './schema'
import type { ChatMessage } from './types'

const messageStore = new Map<ChatLocale, ChatMessage[]>()
const draftStore = new Map<ChatLocale, string>()

export function readSessionMessages(locale: ChatLocale) {
  return messageStore.get(locale) || []
}

export function writeSessionMessages(messages: ChatMessage[], locale: ChatLocale) {
  messageStore.set(locale, messages.slice(-30))
}

export function readSessionDraft(locale: ChatLocale) {
  return draftStore.get(locale) || ''
}

export function writeSessionDraft(value: string, locale: ChatLocale) {
  if (value) draftStore.set(locale, value)
  else draftStore.delete(locale)
}

export function clearChatSession(locale?: ChatLocale) {
  if (locale) {
    messageStore.delete(locale)
    draftStore.delete(locale)
    return
  }
  messageStore.clear()
  draftStore.clear()
}
