'use client'

// The scrolling and part rendering structure is adapted from vercel/chatbot.
import { ArrowDown } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PortfolioToolCard, type PortfolioToolPart } from './ToolCard'
import { getBotGreeting } from '../greeting'
import type { ChatbotConfig, ChatLocale } from '../schema'
import type { ChatMessage } from '../types'
import { StreamingText } from './StreamingText'

const MESSAGE_LAYOUT_TRANSITION = {
  layout: {
    duration: 0.56,
    ease: [0.22, 1, 0.36, 1],
    type: 'tween'
  }
} as const

const MESSAGE_LAYOUT_TRANSITION_REDUCED = {
  layout: { duration: 0 }
} as const

function scrollContainer(container: HTMLDivElement, behavior: ScrollBehavior) {
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ behavior, top: container.scrollHeight })
    return
  }
  container.scrollTop = container.scrollHeight
}

function AssistantText({
  complete,
  onSettled,
  stream,
  streamKey,
  text
}: {
  complete: boolean
  onSettled?: () => void
  stream: boolean
  streamKey: string
  text: string
}) {
  const [isAnimating, setIsAnimating] = useState(stream)
  const displayText = normalizeAssistantText(text)

  if (!isAnimating) {
    return <span className="chatbot-message-response chatbot-message-response--plain">{displayText}</span>
  }

  return (
    <StreamingText
      complete={complete}
      followStream
      onComplete={() => {
        setIsAnimating(false)
        onSettled?.()
      }}
      settleDelay={320}
      showCursor
      streamKey={streamKey}
      text={displayText}
    />
  )
}

export function normalizeAssistantText(text: string) {
  return text
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[\*`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart()
}

export function formatAssistantText(
  text: string,
  { hasTool, locale }: { hasTool: boolean; locale: 'en' | 'zh' }
) {
  const hiddenDetailMarker = 'CHATBOT_HIDDEN_DETAIL'
  const normalized = normalizeAssistantText(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, hiddenDetailMarker)
    .replace(/https?:\/\/\S+/gi, hiddenDetailMarker)
  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || []
  const safeSentences = sentences.filter((sentence) => !sentence.includes(hiddenDetailMarker))
  const fallback = locale === 'zh'
    ? '相关信息已经整理在下方卡片中。'
    : 'The relevant details are ready in the card below.'
  const limited = (safeSentences.length > 0 ? safeSentences : hasTool ? [fallback] : []).slice(
    0,
    hasTool ? 2 : 4
  )
  return limited.join(locale === 'zh' ? '' : ' ')
}

export function inferResponseLocale(text: string, fallback: 'en' | 'zh') {
  const chineseCharacters = text.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const latinCharacters = text.match(/[A-Za-z]/g)?.length ?? 0
  if (chineseCharacters >= 2) return 'zh' as const
  if (latinCharacters >= 2) return 'en' as const
  return fallback
}

function getToolIntroduction(type: string, locale: ChatLocale, config: ChatbotConfig) {
  const name = config.profile.name[locale]
  const introductions = locale === 'zh' ? {
    'tool-showContact': `这里是 ${name} 的公开联系卡，可以直接复制邮箱。`,
    'tool-showLocation': `${name} 的配置地点是 ${config.location.city.zh}；这是城市级 Mock 信息。`,
    'tool-showProfile': `这里整理了 ${name} 的能力方向与持续探索中的小切片 ✨`,
    'tool-showProjects': '下面三张是组件演示使用的 Mock 项目卡片。',
    'tool-showTimeline': `${name} 的 Mock 经历已经整理成时间线，比一大段简历文字更清楚。`
  } : {
    'tool-showContact': `Here is ${name}'s public contact card, with an email you can copy directly.`,
    'tool-showLocation': `${name}'s configured location is ${config.location.city.en}; this is city-level Mock information.`,
    'tool-showProfile': `Here is a compact view of ${name}'s configured capabilities and explorations ✨`,
    'tool-showProjects': 'These three project cards are fictional UI demonstrations.',
    'tool-showTimeline': `${name}'s Mock background is arranged as a timeline, clearer than a wall of résumé copy.`
  }

  return introductions[type as keyof typeof introductions] ?? (
    locale === 'zh'
      ? '相关信息已经整好了，放在下方卡片中。'
      : 'The relevant details are ready in the card below.'
  )
}

function ToolCardReveal({
  config,
  index,
  locale,
  part
}: {
  config: ChatbotConfig
  index: number
  locale: ChatLocale
  part: PortfolioToolPart
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className="t-panel-slide chatbot-tool-card-reveal"
      data-open={open}
      style={{ transitionDelay: `${Math.min(index, 4) * 40}ms` }}
    >
      <PortfolioToolCard config={config} locale={locale} part={part} />
    </div>
  )
}

function AssistantContent({
  config,
  isLatest,
  locale,
  message,
  onCardReveal,
  responseLocale,
  status
}: {
  config: ChatbotConfig
  isLatest: boolean
  locale: ChatLocale
  message: ChatMessage
  onCardReveal?: () => void
  responseLocale: 'en' | 'zh'
  status: 'error' | 'ready' | 'streaming' | 'submitted'
}) {
  const firstToolIndex = message.parts.findIndex((part) => part.type.startsWith('tool-'))
  const leadingParts = firstToolIndex >= 0 ? message.parts.slice(0, firstToolIndex) : message.parts
  const text = leadingParts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n\n')
  const toolParts = message.parts.filter(
    (part): part is PortfolioToolPart => part.type.startsWith('tool-')
  )
  const responseText = text || (
    toolParts.length > 0 ? getToolIntroduction(toolParts[0]?.type ?? '', responseLocale, config) : ''
  )
  const displayText = formatAssistantText(responseText, {
    hasTool: toolParts.length > 0,
    locale: responseLocale
  })
  const stream = isLatest && status === 'streaming'
  const [textSettled, setTextSettled] = useState(!stream)
  const readyToolParts = toolParts.filter(
    (part) => part.state === 'output-available' || part.state === 'output-error'
  )
  const canRevealCards = !stream && textSettled

  useEffect(() => {
    if (stream) setTextSettled(false)
  }, [stream])

  useEffect(() => {
    if (isLatest && canRevealCards && readyToolParts.length > 0) onCardReveal?.()
  }, [canRevealCards, isLatest, onCardReveal, readyToolParts.length])

  return (
    <>
      {displayText ? (
        <AssistantText
          complete={status === 'ready' || status === 'error'}
          onSettled={() => setTextSettled(true)}
          stream={stream}
          streamKey={`${message.id}-text`}
          text={displayText}
        />
      ) : null}
      {canRevealCards
        ? readyToolParts.map((part, index) => (
            <ToolCardReveal
              config={config}
              index={index}
              key={`${message.id}-${part.type}-${index}`}
              locale={locale}
              part={part}
            />
          ))
        : null}
    </>
  )
}

export function ChatMessages({
  config,
  greetingPhase,
  locale,
  messages,
  status,
  welcomeReady
}: {
  config: ChatbotConfig
  greetingPhase: 'exiting' | 'hidden' | 'visible'
  locale: ChatLocale
  messages: ChatMessage[]
  status: 'error' | 'ready' | 'streaming' | 'submitted'
  welcomeReady: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const scrollFrameRef = useRef<number | null>(null)
  const enteringTimersRef = useRef<Map<string, number>>(new Map())
  const previousMessageCountRef = useRef(messages.length)
  const seenMessageIdsRef = useRef(new Set(messages.map((message) => message.id)))
  const [enteringMessageIds, setEnteringMessageIds] = useState<Set<string>>(() => new Set())
  const [isAtBottom, setIsAtBottom] = useState(true)
  const greeting = useMemo(() => getBotGreeting(locale, config), [config, locale])
  const latestAssistantId = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id
  const latestAssistant = latestAssistantId
    ? messages.find((message) => message.id === latestAssistantId)
    : undefined
  const latestAssistantHasContent = latestAssistant?.parts.some(
    (part) => (part.type === 'text' && part.text.trim().length > 0) || part.type.startsWith('tool-')
  ) ?? false
  const showThinking = status === 'submitted' || (status === 'streaming' && !latestAssistantHasContent)

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return
    setIsAtBottom(true)
    requestAnimationFrame(() => scrollContainer(container, behavior))
  }, [])

  useEffect(() => {
    const newIds = messages
      .map((message) => message.id)
      .filter((id) => !seenMessageIdsRef.current.has(id))
    if (newIds.length === 0) return

    newIds.forEach((id) => seenMessageIdsRef.current.add(id))
    setEnteringMessageIds((current) => new Set([...current, ...newIds]))

    for (const id of newIds) {
      const existingTimer = enteringTimersRef.current.get(id)
      if (existingTimer) window.clearTimeout(existingTimer)
      const timer = window.setTimeout(() => {
        setEnteringMessageIds((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
        enteringTimersRef.current.delete(id)
      }, 680)
      enteringTimersRef.current.set(id, timer)
    }
  }, [messages])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const hasNewMessage = messages.length > previousMessageCountRef.current
    previousMessageCountRef.current = messages.length
    if (!hasNewMessage && !isAtBottom) return
    if (hasNewMessage) setIsAtBottom(true)
    requestAnimationFrame(() => {
      scrollContainer(
        container,
        hasNewMessage ? 'smooth' : status === 'streaming' ? 'auto' : 'smooth'
      )
    })
  }, [isAtBottom, messages, status])

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
      enteringTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    },
    []
  )

  const showGreeting = greetingPhase !== 'hidden'
  const showMessages = messages.length > 0 && greetingPhase === 'hidden'

  return (
    <div className="chatbot-messages-wrap">
      {showGreeting ? (
        <div
          className={`chatbot-welcome${greetingPhase === 'exiting' ? ' is-exiting' : ''}`}
        >
          <div className="chatbot-welcome__content">
            {welcomeReady ? (
              <>
                <img
                  alt=""
                  aria-hidden="true"
                  className="chatbot-welcome__avatar"
                  src={config.assistant.avatarUrl}
                />
                <StreamingText
                  className="chatbot-welcome__copy"
                  complete
                  delay={60}
                  settleDelay={300}
                  speed={62}
                  streamKey={`welcome-${locale}`}
                  text={greeting}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {showMessages ? (
        <motion.div
          className="chatbot-messages"
          layoutScroll
          onScroll={(event) => {
            const target = event.currentTarget
            if (scrollFrameRef.current !== null) return
            scrollFrameRef.current = requestAnimationFrame(() => {
              setIsAtBottom(target.scrollTop + target.clientHeight >= target.scrollHeight - 72)
              scrollFrameRef.current = null
            })
          }}
          ref={containerRef}
        >
          {messages.map((message, messageIndex) => {
            const isEntering = enteringMessageIds.has(message.id)
            const previousUserMessage = [...messages.slice(0, messageIndex)]
              .reverse()
              .find((candidate) => candidate.role === 'user')
            const previousUserText = previousUserMessage?.parts
              .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
              .map((part) => part.text)
              .join(' ') ?? ''
            const responseLocale = inferResponseLocale(previousUserText, locale)
            const hasRenderableContent = message.parts.some(
              (part) =>
                (part.type === 'text' && part.text.trim().length > 0) ||
                part.type.startsWith('tool-')
            )
            if (
              message.role === 'assistant' &&
              message.id === latestAssistantId &&
              showThinking &&
              !hasRenderableContent
            ) {
              return null
            }
            return (
              <motion.article
                className={`chatbot-message is-${message.role}${isEntering ? ' is-entering' : ''}`}
                data-role={message.role}
                key={message.id}
                layout="position"
                layoutDependency={messages.length}
                transition={
                  reduceMotion
                    ? MESSAGE_LAYOUT_TRANSITION_REDUCED
                    : MESSAGE_LAYOUT_TRANSITION
                }
              >
                {message.role === 'assistant' ? (
                  <img
                    alt=""
                    aria-hidden="true"
                    className="chatbot-message__avatar"
                    src={config.assistant.avatarUrl}
                  />
                ) : null}
                <div className="chatbot-message__content">
                  {message.role === 'assistant' ? (
                    <AssistantContent
                      config={config}
                      isLatest={message.id === latestAssistantId}
                      locale={locale}
                      message={message}
                      onCardReveal={scrollToLatest}
                      responseLocale={responseLocale}
                      status={status}
                    />
                  ) : (
                    message.parts.map((part, index) =>
                      part.type === 'text' ? <p key={`${message.id}-text-${index}`}>{part.text}</p> : null
                    )
                  )}
                </div>
              </motion.article>
            )
          })}
          {showThinking ? (
            <div className="chatbot-thinking" aria-live="polite">
              <img
                alt=""
                aria-hidden="true"
                className="chatbot-thinking__avatar"
                src={config.assistant.avatarUrl}
              />
              <span
                className="t-shimmer"
                data-text={locale === 'zh' ? '正在整理思路…' : 'Thinking it through…'}
              >
                {locale === 'zh' ? '正在整理思路…' : 'Thinking it through…'}
              </span>
            </div>
          ) : null}
        </motion.div>
      ) : null}
      {!isAtBottom ? (
        <button
          aria-label={locale === 'zh' ? '滚动到最新消息' : 'Scroll to latest message'}
          className="chatbot-scroll-button"
          onClick={() => {
            scrollToLatest('smooth')
          }}
          type="button"
        >
          <ArrowDown size={16} />
        </button>
      ) : null}
    </div>
  )
}
