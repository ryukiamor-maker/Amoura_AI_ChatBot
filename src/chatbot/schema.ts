import { z } from 'zod'

const text = z.string().trim().min(1)
const localizedTextSchema = z.object({
  en: text.max(6000),
  zh: text.max(6000)
})
const localizedListSchema = z.object({
  en: z.array(text.max(160)).max(30),
  zh: z.array(text.max(160)).max(30)
})
const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)
const imageSourceSchema = z.string().trim().min(1).max(1_500_000).refine((value) => {
  if (value.startsWith('/')) return true
  if (value.startsWith('data:image/')) return true
  try { return new URL(value).protocol === 'https:' } catch { return false }
}, 'Image must use a public path beginning with / or an HTTPS URL.')
const linkSourceSchema = z.string().trim().min(1).max(2048).refine((value) => {
  if (value.startsWith('/')) return true
  try { return new URL(value).protocol === 'https:' } catch { return false }
}, 'Link must use a public path beginning with / or an HTTPS URL.')

export const chatLocaleSchema = z.enum(['en', 'zh'])
export const chatModeSchema = z.enum(['mock', 'live'])

export const projectCardSchema = z.object({
  cover: z.object({
    accent: hexColorSchema,
    eyebrow: localizedTextSchema
  }),
  href: linkSourceSchema,
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  role: localizedTextSchema,
  summary: localizedTextSchema,
  tags: localizedListSchema,
  title: localizedTextSchema,
  year: z.number().int().min(2000).max(2100)
})

export const profileCardSchema = z.object({
  href: linkSourceSchema,
  name: localizedTextSchema,
  role: localizedTextSchema,
  skills: localizedListSchema,
  summary: localizedTextSchema
})

export const timelineCardSchema = z.object({
  href: linkSourceSchema,
  items: z.array(z.object({
    date: text.max(40),
    detail: localizedTextSchema,
    title: localizedTextSchema
  })).min(1).max(8),
  title: localizedTextSchema
})

export const contactCardSchema = z.object({
  email: z.email(),
  href: linkSourceSchema,
  note: localizedTextSchema,
  title: localizedTextSchema
})

export const locationCardSchema = z.object({
  city: localizedTextSchema,
  country: localizedTextSchema,
  mapUrl: z.url(),
  note: localizedTextSchema,
  timezone: z.string().regex(/^UTC[+-]\d{1,2}$/)
})

const apiBaseUrlSchema = z.url().superRefine((value, context) => {
  const url = new URL(value)
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHosts.has(url.hostname))) {
    context.addIssue({
      code: 'custom',
      message: 'API Base URL must use HTTPS; localhost may use HTTP.'
    })
  }
})

export const chatbotConfigSchema = z.object({
  api: z.object({
    baseURL: apiBaseUrlSchema,
    model: text.max(160)
  }),
  appearance: z.object({
    accent: hexColorSchema,
    card: hexColorSchema,
    launcherDelayMs: z.number().int().min(0).max(10000),
    motion: z.enum(['full', 'gentle', 'reduced']),
    position: z.enum(['left', 'center', 'right']),
    surface: hexColorSchema
  }),
  assistant: z.object({
    avatarUrl: imageSourceSchema.default('/assets/chatbot/icons/bot.svg'),
    name: localizedTextSchema,
    persona: localizedTextSchema
  }),
  contact: contactCardSchema,
  defaultLocale: chatLocaleSchema,
  evaluations: z.array(z.object({
    expectedIntent: z.enum(['contact', 'fallback', 'location', 'profile', 'projects', 'timeline']),
    id: z.string().regex(/^[a-z0-9-]+$/),
    prompt: localizedTextSchema
  })).min(5).max(60),
  faq: z.array(z.object({
    answer: localizedTextSchema,
    id: z.string().regex(/^[a-z0-9-]+$/),
    question: localizedTextSchema
  })).max(60),
  launcher: z.object({
    iconUrl: imageSourceSchema.default('/assets/chatbot/icons/bot.svg'),
    label: localizedTextSchema
  }),
  location: locationCardSchema,
  mode: chatModeSchema,
  profile: profileCardSchema,
  projects: z.array(projectCardSchema).min(1).max(12),
  rules: z.array(localizedTextSchema).max(30),
  suggestions: z.array(z.object({
    card: z.enum(['contact', 'location', 'none', 'profile', 'projects', 'timeline']).default('none'),
    id: z.string().regex(/^[a-z0-9-]+$/),
    icon: z.enum(['ai', 'background', 'contact', 'custom', 'location', 'none', 'work']).default('ai'),
    iconUrl: imageSourceSchema.optional(),
    label: localizedTextSchema,
    prompt: localizedTextSchema,
    response: localizedTextSchema.default({
      en: 'This answer comes from the configured mock content.',
      zh: '这段回答来自当前配置的 Mock 内容。'
    })
  })).max(8),
  timeline: timelineCardSchema,
  version: z.literal(1)
})

export type ChatbotConfig = z.infer<typeof chatbotConfigSchema>
export type ChatLocale = z.infer<typeof chatLocaleSchema>
export type ProjectCardData = z.infer<typeof projectCardSchema>
export type ProfileCardData = z.infer<typeof profileCardSchema>
export type TimelineCardData = z.infer<typeof timelineCardSchema>
export type ContactCardData = z.infer<typeof contactCardSchema>
export type LocationCardData = z.infer<typeof locationCardSchema>

export function migrateChatbotConfig(input: unknown): ChatbotConfig {
  if (!input || typeof input !== 'object') throw new Error('Chatbot configuration must be an object.')
  const version = (input as { version?: unknown }).version
  if (version !== 1) throw new Error(`Unsupported chatbot configuration version: ${String(version)}`)
  return chatbotConfigSchema.parse(input)
}
