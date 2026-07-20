'use client'

// Adapted from Iconiq UI's Streaming Text registry component.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Fragment,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes
} from 'react'

import { cn } from '@/lib/utils'

type StreamToken =
  | { type: 'word'; value: string }
  | { type: 'space'; value: string }
  | { type: 'break'; value: string }

type StreamingTextProps = HTMLAttributes<HTMLSpanElement> & {
  complete?: boolean
  delay?: number
  followStream?: boolean
  onComplete?: () => void
  settleDelay?: number
  showCursor?: boolean
  speed?: number
  streamKey: string
  text: string
}

const proseTokens = /(\n+|[^\S\n]+|[^\s]+)/g
const streamedProseTokens = /(\n+|[^\S\n]+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+)/gu
const settleFade = 0.45
const enterFade = 0.58
const gradientPhases = 6

function tokenize(text: string, granular: boolean): StreamToken[] {
  const parts = text.match(granular ? streamedProseTokens : proseTokens) ?? []
  return parts.map((value) => {
    if (value.startsWith('\n')) return { type: 'break', value }
    if (/^[^\S\n]+$/.test(value)) return { type: 'space', value }
    return { type: 'word', value }
  })
}

function visibleTokens(tokens: StreamToken[], visibleWords: number) {
  const result: StreamToken[] = []
  let words = 0

  for (const token of tokens) {
    if (token.type === 'word') {
      if (words >= visibleWords) break
      words += 1
      result.push(token)
      continue
    }

    // Separators belong to the following word. This keeps a partially streamed
    // response from ending in a layout-affecting space or an empty line.
    if (words >= visibleWords) break
    result.push(token)
  }

  return result
}

function gradientOffset(index: number) {
  const cycle = 2 * (gradientPhases - 1)
  const step = index % cycle
  const phase = step < gradientPhases ? step : cycle - step
  return `${(phase / (gradientPhases - 1)) * 100}% 50%`
}

function settleTransition(settleDelay: number) {
  return {
    delay: settleDelay / 1000,
    duration: settleFade,
    ease: [0.4, 0, 0.2, 1] as const
  }
}

const StreamedWord = memo(function StreamedWord({
  index,
  settleDelay,
  word
}: {
  index: number
  settleDelay: number
  word: string
}) {
  return (
    <motion.span
      animate={{ opacity: 1 }}
      className="streaming-text__word"
      initial={{ opacity: 0 }}
      transition={{ duration: enterFade, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.span
        animate={{ opacity: 1 }}
        className="streaming-text__word-layer"
        initial={{ opacity: 0 }}
        transition={settleTransition(settleDelay)}
      >
        {word}
      </motion.span>
      <motion.span
        animate={{ opacity: 0 }}
        className="streaming-text__word-layer streaming-text__word-layer--gradient"
        initial={{ opacity: 1 }}
        style={{
          backgroundPosition: gradientOffset(index),
          backgroundSize: '300% 100%'
        }}
        transition={settleTransition(settleDelay)}
      >
        {word}
      </motion.span>
    </motion.span>
  )
})

export function StreamingText({
  className,
  complete = true,
  delay = 0,
  followStream = false,
  onComplete,
  settleDelay = 300,
  showCursor = true,
  speed = 70,
  streamKey,
  text,
  ...props
}: StreamingTextProps) {
  const tokens = useMemo(() => tokenize(text.trimEnd(), followStream), [followStream, text])
  const wordCount = useMemo(
    () => tokens.reduce((total, token) => total + (token.type === 'word' ? 1 : 0), 0),
    [tokens]
  )
  const [count, setCount] = useState(0)
  const [activeKey, setActiveKey] = useState(streamKey)
  const reduceMotion = useReducedMotion() ?? false
  const startRef = useRef(0)
  const completedKeyRef = useRef<string | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  if (activeKey !== streamKey) {
    setActiveKey(streamKey)
    setCount(0)
    completedKeyRef.current = null
    startRef.current = 0
  }

  useEffect(() => {
    if (followStream || reduceMotion || count >= wordCount) return

    if (count === 0 && startRef.current === 0) startRef.current = performance.now()
    const target = startRef.current + delay + (count + 1) * Math.max(speed, 16)
    const timer = window.setTimeout(
      () => setCount((current) => Math.min(current + 1, wordCount)),
      Math.max(0, target - performance.now())
    )
    return () => window.clearTimeout(timer)
  }, [count, delay, followStream, reduceMotion, speed, wordCount])

  const visibleCount = followStream ? wordCount : count

  useEffect(() => {
    const finished = reduceMotion || (
      complete && wordCount > 0 && visibleCount >= wordCount
    )
    if (!finished || completedKeyRef.current === streamKey) return

    const finish = () => {
      completedKeyRef.current = streamKey
      onCompleteRef.current?.()
    }
    const completionDelay = followStream && !reduceMotion
      ? settleDelay + settleFade * 1000
      : 0

    if (completionDelay === 0) {
      finish()
      return
    }

    const timer = window.setTimeout(finish, completionDelay)
    return () => window.clearTimeout(timer)
  }, [complete, followStream, reduceMotion, settleDelay, streamKey, visibleCount, wordCount])

  const renderedTokens = visibleTokens(tokens, visibleCount)
  const lastWordIndex = renderedTokens.findLastIndex((token) => token.type === 'word')
  const streaming = !reduceMotion && (!complete || visibleCount < wordCount)

  return (
    <span
      aria-label={text}
      className={cn('streaming-text', className)}
      data-visible-count={visibleCount}
      data-word-count={wordCount}
      {...props}
    >
      {reduceMotion ? (
        text
      ) : (
        <span aria-hidden="true">
            {renderedTokens.map((token, index) => {
              if (token.type !== 'word') {
                return <Fragment key={`${token.type}-${index}`}>{token.value}</Fragment>
              }

              const word = (
                <StreamedWord index={index} settleDelay={settleDelay} word={token.value} />
              )

              if (index !== lastWordIndex) return <Fragment key={`word-${index}`}>{word}</Fragment>

              return (
                <span className="streaming-text__tail" key={`word-${index}`}>
                  {word}
                  {showCursor ? (
                    <AnimatePresence>
                      {streaming ? (
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
                          className="streaming-text__cursor"
                          exit={{ opacity: 0, scale: 0 }}
                          initial={{ opacity: 0, scale: 0 }}
                          transition={{
                            opacity: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
                            scale: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
                          }}
                        />
                      ) : null}
                    </AnimatePresence>
                  ) : null}
                </span>
              )
            })}
        </span>
      )}
    </span>
  )
}
