import configJson from '../content/chatbot-config.json'
import { describe, expect, it } from 'vitest'

import { chatbotConfigSchema, migrateChatbotConfig } from '@/chatbot/schema'

describe('chatbot configuration schema', () => {
  it('accepts the committed fictional configuration', () => {
    expect(chatbotConfigSchema.parse(configJson).version).toBe(1)
  })

  it('rejects unsupported versions explicitly', () => {
    expect(() => migrateChatbotConfig({ ...configJson, version: 0 })).toThrow('Unsupported chatbot configuration version')
  })

  it('rejects insecure remote base URLs but allows local development', () => {
    expect(chatbotConfigSchema.safeParse({ ...configJson, api: { ...configJson.api, baseURL: 'http://provider.example.com/v1' } }).success).toBe(false)
    expect(chatbotConfigSchema.safeParse({ ...configJson, api: { ...configJson.api, baseURL: 'http://localhost:11434/v1' } }).success).toBe(true)
  })
})
