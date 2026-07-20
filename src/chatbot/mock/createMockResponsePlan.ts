import type { ChatbotConfig, ChatLocale } from '../schema'
import type { MockResponsePlan, MockToolPlan } from '../types'

function configuredTool(
  card: ChatbotConfig['suggestions'][number]['card'],
  config: ChatbotConfig
): MockToolPlan | undefined {
  if (card === 'projects') return { input: { reason: 'Configured shortcut response.' }, name: 'showProjects', output: { projects: config.projects.slice(0, 3) } }
  if (card === 'profile') return { input: { reason: 'Configured shortcut response.' }, name: 'showProfile', output: config.profile }
  if (card === 'timeline') return { input: { reason: 'Configured shortcut response.' }, name: 'showTimeline', output: config.timeline }
  if (card === 'contact') return { input: { reason: 'Configured shortcut response.' }, name: 'showContact', output: config.contact }
  if (card === 'location') return { input: { reason: 'Configured shortcut response.' }, name: 'showLocation', output: config.location }
  return undefined
}

export function createMockResponsePlan(
  prompt: string,
  locale: ChatLocale,
  config: ChatbotConfig
): MockResponsePlan {
  const normalized = prompt.trim().toLowerCase()
  const configuredSuggestion = config.suggestions.find(
    (item) => item.prompt[locale].trim().toLowerCase() === normalized
  )
  if (configuredSuggestion) {
    return {
      intent: configuredSuggestion.card === 'none' ? 'fallback' : configuredSuggestion.card,
      text: configuredSuggestion.response[locale],
      tool: configuredTool(configuredSuggestion.card, config)
    }
  }
  const asksForProjects = /project|portfolio|work|case|项目|作品|案例/.test(normalized)
  const asksForProfile = /skill|capabilit|speciali[sz]|profile|擅长|能力|技能|方向|简介/.test(normalized)
  const asksForTimeline = /background|education|experience|career|path|经历|教育|背景|履历/.test(normalized)
  const asksForContact = /contact|email|reach|hire|collaborat|合作|联系|邮箱|邮件/.test(normalized)
  const asksForLocation = /location|where|based|city|地点|哪里|在哪|城市|位置/.test(normalized)

  const faq = config.faq.find((item) => {
    const question = item.question[locale].toLowerCase()
    return normalized.length > 4 && (question.includes(normalized) || normalized.includes(question))
  })
  if (faq) return { intent: 'fallback', text: faq.answer[locale] }

  if (asksForProjects && !asksForContact && !asksForLocation) {
    return {
      intent: 'projects',
      text: locale === 'zh'
        ? '这里是配置中最具代表性的三个虚构项目。它们用于展示卡片、流式回复和工具调用的组合方式。'
        : 'Here are three representative fictional projects from the current configuration, demonstrating streamed copy and tool cards together.',
      tool: {
        input: { reason: 'The visitor asked to explore configured project examples.' },
        name: 'showProjects',
        output: { projects: config.projects.slice(0, 3) }
      }
    }
  }

  if (asksForProfile && !asksForContact && !asksForLocation) {
    return {
      intent: 'profile',
      text: locale === 'zh'
        ? `${config.profile.name.zh} 的 Mock 档案涵盖${config.profile.skills.zh.slice(0, 3).join('、')}。`
        : `${config.profile.name.en}'s Mock profile covers ${config.profile.skills.en.slice(0, 3).join(', ')}.`,
      tool: {
        input: { reason: 'The visitor asked about configured capabilities.' },
        name: 'showProfile',
        output: config.profile
      }
    }
  }

  if (asksForTimeline && !asksForContact && !asksForLocation) {
    return {
      intent: 'timeline',
      text: locale === 'zh'
        ? `这条时间线整理了 ${config.profile.name.zh} 的虚构经历。`
        : `This timeline presents ${config.profile.name.en}'s fictional background.`,
      tool: {
        input: { reason: 'The visitor asked about the configured background.' },
        name: 'showTimeline',
        output: config.timeline
      }
    }
  }

  if (asksForContact) {
    return {
      intent: 'contact',
      text: locale === 'zh'
        ? '下面是 Mock 联系卡片，可以直接复制示例邮箱。'
        : 'Below is the Mock contact card, including a copyable example email.',
      tool: {
        input: { reason: 'The visitor asked for configured contact information.' },
        name: 'showContact',
        output: config.contact
      }
    }
  }

  if (asksForLocation) {
    return {
      intent: 'location',
      text: locale === 'zh'
        ? `${config.location.city.zh} 是用于演示地点卡片的虚构城市。`
        : `${config.location.city.en} is a fictional city used to demonstrate the location card.`,
      tool: {
        input: { reason: 'The visitor asked for the configured demonstration location.' },
        name: 'showLocation',
        output: config.location
      }
    }
  }

  return {
    intent: 'fallback',
    text: locale === 'zh'
      ? `你可以询问 ${config.profile.name.zh} 的能力、Mock 经历、示例联系方式或虚构地点，也可以查看项目卡片。`
      : `Ask about ${config.profile.name.en}'s capabilities, Mock background, example contact details, fictional location, or project cards.`
  }
}
