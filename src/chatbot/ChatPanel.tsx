'use client'

import { useChat } from '@ai-sdk/react'
import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import { withBasePath } from '@/lib/base-path'
import { ChatMessages } from './core/ChatMessages'
import { ChatPromptInput } from './core/ChatPromptInput'
import { SuggestedActions } from './core/SuggestedActions'

export function isWelcomePlaybackReady(transitionPhase: ChatbotTransitionPhase) {
  return transitionPhase === 'open'
}
import { createApiChatTransport } from './live/createApiChatTransport'
import { MockChatTransport } from './mock/MockChatTransport'
import type { ChatbotConfig, ChatLocale } from './schema'
import { readSessionMessages, writeSessionMessages } from './session'
import type { ChatbotTransitionPhase, ChatMessage } from './types'

export function PortfolioChatPanel({
  apiEndpoint,
  composerHost,
  config,
  locale,
  onClose,
  onPromptReady,
  onStopReady,
  transitionPhase
}: {
  apiEndpoint: string
  composerHost: HTMLDivElement | null
  config: ChatbotConfig
  locale: ChatLocale
  onClose: () => void
  onPromptReady?: (element: HTMLDivElement) => void
  onStopReady?: (stop: () => void) => void
  transitionPhase: ChatbotTransitionPhase
}) {
  const transport = useMemo(
    () => config.mode === 'mock'
      ? new MockChatTransport(config, locale)
      : createApiChatTransport(locale, apiEndpoint),
    [apiEndpoint, config, locale]
  )
  const [initialMessages] = useState<ChatMessage[]>(() => readSessionMessages(locale))
  const [greetingPhase, setGreetingPhase] = useState<'exiting' | 'hidden' | 'visible'>(
    initialMessages.length > 0 ? 'hidden' : 'visible'
  )
  const greetingTimerRef = useRef<number | null>(null)
  const lastSendAtRef = useRef(0)
  const sendLockRef = useRef(false)
  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop
  } = useChat<ChatMessage>({
    id: `portable-chatbot-${locale}`,
    messages: initialMessages,
    transport
  })

  useEffect(() => {
    writeSessionMessages(messages, locale)
  }, [locale, messages])

  useEffect(() => {
    onStopReady?.(stop)
  }, [onStopReady, stop])

  useEffect(() => {
    if (status === 'ready' || status === 'error') sendLockRef.current = false
  }, [status])

  useEffect(
    () => () => {
      if (greetingTimerRef.current !== null) window.clearTimeout(greetingTimerRef.current)
    },
    []
  )

  function send(prompt: string) {
    const now = Date.now()
    if (
      sendLockRef.current ||
      now - lastSendAtRef.current < 500 ||
      status === 'submitted' ||
      status === 'streaming'
    ) {
      return
    }
    lastSendAtRef.current = now
    sendLockRef.current = true
    clearError()
    if (messages.length === 0 && greetingPhase === 'visible') {
      setGreetingPhase('exiting')
      greetingTimerRef.current = window.setTimeout(() => {
        setGreetingPhase('hidden')
        greetingTimerRef.current = null
      }, 240)
    }
    void sendMessage({
      metadata: { createdAt: new Date().toISOString() },
      parts: [{ text: prompt, type: 'text' }],
      role: 'user'
    }).catch(() => {
      sendLockRef.current = false
    })
  }

  const isBusy = status === 'streaming' || status === 'submitted'
  const isInputState = messages.length === 0 || greetingPhase !== 'hidden'
  // Start the greeting only after every opening phase is visible. Mounting it
  // during opening-welcome lets several words advance behind the control fade.
  const welcomeReady = isWelcomePlaybackReady(transitionPhase)

  function closeBeforeNavigation(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as Element).closest('a[href]')) onClose()
  }

  return (
    <div
      className={`chatbot-panel__inner${isInputState ? ' is-input-state' : ' has-messages'}`}
      data-transition-phase={transitionPhase}
      onClickCapture={closeBeforeNavigation}
    >
      <ChatMessages
        config={config}
        greetingPhase={greetingPhase}
        locale={locale}
        messages={messages}
        status={status}
        welcomeReady={welcomeReady}
      />
      <div className="chatbot-panel__bottom">
        {error ? (
          <div className="chatbot-error" role="alert">
            <span>{locale === 'zh' ? '回复遇到问题，请重试。' : 'The response failed. Please retry.'}</span>
            <button
              onClick={() => {
                clearError()
                void regenerate()
              }}
              type="button"
            >
              <RotateCcw size={14} />
              {locale === 'zh' ? '重试' : 'Retry'}
            </button>
          </div>
        ) : null}
        <div className="chatbot-composer-row">
          <ChatPromptInput
            assistantName={config.profile.name[locale]}
            layoutKey={`${isInputState ? 'input' : 'messages'}:${error ? 'error' : 'ready'}`}
            locale={locale}
            onSend={send}
            onShellReady={onPromptReady}
            onStop={stop}
            portalTarget={composerHost}
            status={status}
          />
          <button
            aria-label={locale === 'zh' ? '关闭聊天' : 'Close chat'}
            className="chatbot-close"
            onClick={onClose}
            type="button"
          >
            <img alt="" aria-hidden="true" src={withBasePath('/assets/chatbot/icons/close.svg')} />
          </button>
        </div>
        <SuggestedActions config={config} disabled={isBusy} locale={locale} onSelect={send} />
      </div>
    </div>
  )
}
