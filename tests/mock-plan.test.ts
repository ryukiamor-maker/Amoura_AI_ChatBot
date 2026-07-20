import configJson from '../content/chatbot-config.json'
import { describe, expect, it } from 'vitest'

import { chatbotConfigSchema } from '@/chatbot/schema'
import { createMockResponsePlan } from '@/chatbot/mock/createMockResponsePlan'

const config = chatbotConfigSchema.parse(configJson)

describe('mock response planning', () => {
  it.each([
    ['Show me the projects', 'projects', 'showProjects'],
    ['What skills are covered?', 'profile', 'showProfile'],
    ['Tell me about the background', 'timeline', 'showTimeline'],
    ['How can I contact you?', 'contact', 'showContact'],
    ['Where are you based?', 'location', 'showLocation']
  ])('maps %s to the configured tool', (prompt, intent, toolName) => {
    const plan = createMockResponsePlan(prompt, 'en', config)
    expect(plan.intent).toBe(intent)
    expect(plan.tool?.name).toBe(toolName)
  })

  it('returns configured data rather than a separate studio source', () => {
    const plan = createMockResponsePlan('给我看看项目', 'zh', config)
    expect(plan.tool?.name).toBe('showProjects')
    if (plan.tool?.name === 'showProjects') expect(plan.tool.output.projects[0]).toEqual(config.projects[0])
  })

  it('uses each configured shortcut response and falls back to text when no card is selected', () => {
    const custom = structuredClone(config)
    custom.suggestions = [{
      card: 'none',
      icon: 'none',
      id: 'shortcut-custom',
      label: { en: 'Custom', zh: '自定义' },
      prompt: { en: 'Run custom answer', zh: '运行自定义回答' },
      response: { en: 'Configured plain text.', zh: '配置好的纯文字。' }
    }]
    const plan = createMockResponsePlan('Run custom answer', 'en', custom)
    expect(plan.text).toBe('Configured plain text.')
    expect(plan.tool).toBeUndefined()
  })
})
