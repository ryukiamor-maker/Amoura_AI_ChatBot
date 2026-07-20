import { tool } from 'ai'
import { z } from 'zod'

import type { ChatbotConfig, ChatLocale } from '@/chatbot/schema'

const reasonSchema = z.object({
  reason: z.string().min(1).max(240)
})

export function buildSystemPrompt(config: ChatbotConfig, locale: ChatLocale) {
  const knowledge = {
    contact: config.contact,
    faq: config.faq,
    location: config.location,
    profile: config.profile,
    projects: config.projects,
    timeline: config.timeline
  }

  return [
    locale === 'zh'
      ? `你是“${config.assistant.name.zh}”，${config.profile.name.zh} 的 AI 作品集向导。所有知识都来自当前配置；默认配置完全是 Mock 数据。`
      : `You are ${config.assistant.name.en}, the AI portfolio guide for ${config.profile.name.en}. All knowledge comes from the current configuration, whose defaults are entirely Mock data.`,
    config.assistant.persona[locale],
    `Reply in ${locale === 'zh' ? 'Simplified Chinese' : 'English'}.`,
    ...config.rules.map((rule) => rule[locale]),
    'Keep answers focused and conversational. Use plain text without Markdown headings, lists, tables, or link syntax.',
    'When an intent matches a display tool, first write one or two useful sentences, then call that tool. Do not repeat emails or URLs in prose and do not add prose after the tool call.',
    'Use a matching display tool when the visitor asks for projects, profile, timeline, contact, or location.',
    `Verified configuration:\n${JSON.stringify(knowledge)}`
  ].join('\n\n')
}

export function createChatTools(config: ChatbotConfig) {
  return {
    showContact: tool({
      description: 'Show the configured contact card.',
      inputSchema: reasonSchema,
      execute: async () => config.contact
    }),
    showLocation: tool({
      description: 'Show the configured city-level location card.',
      inputSchema: reasonSchema,
      execute: async () => config.location
    }),
    showProfile: tool({
      description: 'Show the configured profile and capabilities card.',
      inputSchema: reasonSchema,
      execute: async () => config.profile
    }),
    showProjects: tool({
      description: 'Show the configured fictional UI-demonstration project cards.',
      inputSchema: reasonSchema.extend({
        ids: z.array(z.string()).max(6).optional()
      }),
      execute: async ({ ids }) => ({
        projects: ids?.length
          ? config.projects.filter((project) => ids.includes(project.id))
          : config.projects.slice(0, 3)
      })
    }),
    showTimeline: tool({
      description: 'Show the configured background timeline card.',
      inputSchema: reasonSchema,
      execute: async () => config.timeline
    })
  }
}
