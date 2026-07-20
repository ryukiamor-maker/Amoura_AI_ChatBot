'use client'

import type { CSSProperties } from 'react'

import type { ChatbotConfig, ChatLocale } from '../schema'

export function SuggestedActions({
  config,
  disabled,
  locale,
  onSelect
}: {
  config: ChatbotConfig
  disabled: boolean
  locale: ChatLocale
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="chatbot-suggestions" aria-label={locale === 'zh' ? '建议问题' : 'Suggested questions'}>
      {config.suggestions.map((item, index) => (
        <button
          disabled={disabled}
          key={item.id}
          onClick={() => onSelect(item.prompt[locale])}
          style={{ '--suggestion-index': index } as CSSProperties}
          type="button"
        >
          {item.iconUrl || (item.icon !== 'none' && item.icon !== 'custom') ? <img alt="" aria-hidden="true" src={item.iconUrl || `/assets/chatbot/icons/${item.icon}.svg`} /> : null}
          {item.label[locale]}
        </button>
      ))}
    </div>
  )
}
