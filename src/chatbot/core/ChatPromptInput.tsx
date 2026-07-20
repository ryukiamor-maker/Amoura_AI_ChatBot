'use client'

// A deliberately stripped adaptation of vercel/chatbot multimodal-input.tsx.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { readSessionDraft, writeSessionDraft } from '../session'

export function ChatPromptInput({
  assistantName,
  layoutKey,
  locale,
  onShellReady,
  onSend,
  onStop,
  portalTarget,
  status
}: {
  assistantName: string
  layoutKey?: string
  locale: 'en' | 'zh'
  onShellReady?: (element: HTMLDivElement) => void
  onSend: (value: string) => void
  onStop: () => void
  portalTarget?: HTMLElement | null
  status: 'error' | 'ready' | 'streaming' | 'submitted'
}) {
  const [input, setInput] = useState('')
  const shellRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const isBusy = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    setInput(readSessionDraft(locale))
  }, [locale])

  useEffect(() => {
    writeSessionDraft(input, locale)
  }, [input, locale])

  useLayoutEffect(() => {
    if (shellRef.current) onShellReady?.(shellRef.current)
  }, [layoutKey, onShellReady])

  function submit() {
    const value = input.trim()
    if (!value || isBusy) return
    setInput('')
    if (textareaRef.current) textareaRef.current.value = ''
    writeSessionDraft('', locale)
    onSend(value)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const prompt = (
    <form
      id="portfolio-chatbot-composer"
      className="chatbot-prompt"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <textarea
        aria-label={locale === 'zh' ? '向 AI 助手提问' : 'Ask the AI twin'}
        disabled={false}
        onCompositionEnd={() => {
          isComposingRef.current = false
        }}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            const nativeEvent = event.nativeEvent
            if (
              isComposingRef.current ||
              nativeEvent.isComposing ||
              nativeEvent.keyCode === 229
            ) {
              return
            }
            event.preventDefault()
            submit()
          }
        }}
        placeholder={locale === 'zh' ? '想了解什么？' : `Ask about ${assistantName}...`}
        ref={textareaRef}
        rows={1}
        value={input}
      />
      <button
        aria-label={
          isBusy
            ? locale === 'zh'
              ? '停止生成'
              : 'Stop generating'
            : locale === 'zh'
              ? '发送'
              : 'Send'
        }
        className="chatbot-prompt__submit"
        disabled={!isBusy && !input.trim()}
        onClick={isBusy ? onStop : undefined}
        type={isBusy ? 'button' : 'submit'}
      >
        <span className="t-icon-swap chatbot-prompt__icon-swap" data-state={isBusy ? 'b' : 'a'}>
          <span className="t-icon" data-icon="a">
            <img alt="" aria-hidden="true" src="/assets/chatbot/icons/arrow-up.svg" />
          </span>
          <span className="t-icon" data-icon="b">
            <span className="chatbot-prompt__stop-icon" />
          </span>
        </span>
      </button>
    </form>
  )

  return (
    <div className="chatbot-prompt-shell" ref={shellRef}>
      {portalTarget ? createPortal(prompt, portalTarget) : prompt}
    </div>
  )
}
