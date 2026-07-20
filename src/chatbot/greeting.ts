import type { ChatbotConfig, ChatLocale } from './schema'

export function getBotGreeting(locale: ChatLocale, config: ChatbotConfig, date = new Date()) {
  const hour = date.getHours()

  if (locale === 'zh') {
    const greeting =
      hour >= 5 && hour < 12
        ? '早上好'
        : hour >= 12 && hour < 18
          ? '下午好'
          : hour >= 18 && hour < 23
            ? '晚上好'
            : '夜深了，还没休息吗'

    return `${greeting}，我是 ${config.assistant.name.zh}，很高兴见到你！我是 ${config.profile.name.zh} 的 AI 作品集向导。想了解经历、项目、能力、地点或联系方式，都可以问我。当前内容来自 Mock 配置。`
  }

  const greeting =
    hour >= 5 && hour < 12
      ? 'Good morning'
      : hour >= 12 && hour < 18
        ? 'Good afternoon'
        : hour >= 18 && hour < 23
          ? 'Good evening'
          : 'Still up'

  return `Hey, this is ${config.assistant.name.en}. ${greeting}! I’m the AI portfolio guide for ${config.profile.name.en}. Ask about the background, work, capabilities, or location. The current content is Mock data.`
}
