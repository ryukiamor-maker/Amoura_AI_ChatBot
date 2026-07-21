'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

import { withBasePath } from '@/lib/base-path'
import type { ChatbotConfig, ChatLocale } from './schema'
import type { ChatbotTransitionPhase } from './types'
import { GlassSurface } from './GlassSurface'

import './styles.css'

type ChatPanelComponent = React.ComponentType<{
  apiEndpoint: string
  config: ChatbotConfig
  locale: ChatLocale
  composerHost: HTMLDivElement | null
  onClose: () => void
  onPromptReady?: (element: HTMLDivElement) => void
  onStopReady?: (stop: () => void) => void
  transitionPhase: ChatbotTransitionPhase
}>

type MotionRect = {
  height: number
  left: number
  top: number
  width: number
}

type MorphGeometry = {
  closed: MotionRect
  open: MotionRect
}

type LauncherPosition = { x: number; y: number }
type LauncherDrag = { height: number; moved: boolean; originX: number; originY: number; pointerId: number; startX: number; startY: number; width: number }

function readRect(element: Element): MotionRect {
  const rect = element.getBoundingClientRect()
  return { height: rect.height, left: rect.left, top: rect.top, width: rect.width }
}

function readLauncherBounds() {
  const element = document.querySelector<HTMLElement>('[data-chatbot-drag-bounds]')
  if (element) return element.getBoundingClientRect()
  return { bottom: window.innerHeight, height: window.innerHeight, left: 0, right: window.innerWidth, top: 0, width: window.innerWidth }
}

function rectsMatch(a: MotionRect, b: MotionRect) {
  return (
    Math.abs(a.height - b.height) < 0.25 &&
    Math.abs(a.left - b.left) < 0.25 &&
    Math.abs(a.top - b.top) < 0.25 &&
    Math.abs(a.width - b.width) < 0.25
  )
}

function morphStyle(geometry: MorphGeometry | null) {
  if (!geometry) return undefined
  const { closed, open } = geometry
  return {
    '--chatbot-morph-closed-height': `${closed.height}px`,
    '--chatbot-morph-closed-left': `${closed.left}px`,
    '--chatbot-morph-closed-top': `${closed.top}px`,
    '--chatbot-morph-closed-width': `${closed.width}px`,
    '--chatbot-morph-open-height': `${open.height}px`,
    '--chatbot-morph-open-left': `${open.left}px`,
    '--chatbot-morph-open-top': `${open.top}px`,
    '--chatbot-morph-open-width': `${open.width}px`
  } as CSSProperties
}

export type ChatbotWidgetProps = {
  apiEndpoint?: string
  config: ChatbotConfig
  locale?: ChatLocale
  overlayScope?: 'host' | 'viewport'
}

export function ChatbotWidget({
  apiEndpoint = withBasePath('/api/chat'),
  config,
  locale = config.defaultLocale,
  overlayScope = 'viewport'
}: ChatbotWidgetProps) {
  const [phase, setPhase] = useState<ChatbotTransitionPhase>('closed')
  const [launcherVisible, setLauncherVisible] = useState(false)
  const [launcherSettled, setLauncherSettled] = useState(false)
  const [ChatPanel, setChatPanel] = useState<ChatPanelComponent | null>(null)
  const [composerHost, setComposerHost] = useState<HTMLDivElement | null>(null)
  const [morphExpanded, setMorphExpanded] = useState(false)
  const [morphGeometry, setMorphGeometry] = useState<MorphGeometry | null>(null)
  const [overlayBounds, setOverlayBounds] = useState<MotionRect | null>(null)
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition | null>(null)
  const launcherVisibleRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const morphShellRef = useRef<HTMLDivElement>(null)
  const promptShellRef = useRef<HTMLDivElement | null>(null)
  const openingLauncherRectRef = useRef<MotionRect | null>(null)
  const stopRef = useRef<() => void>(() => undefined)
  const phaseRef = useRef<ChatbotTransitionPhase>('closed')
  const pendingCloseRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const dragRef = useRef<LauncherDrag | null>(null)
  const suppressClickRef = useRef(false)
  const manualPositionRef = useRef(false)
  const positionModeRef = useRef(config.appearance.position)
  const overlayMounted = phase !== 'closed'

  useLayoutEffect(() => {
    if (!overlayMounted || overlayScope !== 'host') return
    const host = document.querySelector<HTMLElement>('[data-chatbot-drag-bounds]')
    if (!host) return
    const measure = () => setOverlayBounds(readRect(host))
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    measure()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [overlayMounted, overlayScope])

  const handleComposerHost = useCallback((element: HTMLDivElement | null) => {
    morphShellRef.current = element
    setComposerHost(element)
  }, [])

  const updatePhase = useCallback((next: ChatbotTransitionPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
    return timer
  }, [])

  useEffect(() => {
    const reveal = () => {
      if (launcherVisibleRef.current) return
      launcherVisibleRef.current = true
      setLauncherVisible(true)
    }

    const fallback = window.setTimeout(reveal, config.appearance.launcherDelayMs)

    return () => {
      window.clearTimeout(fallback)
    }
  }, [config.appearance.launcherDelayMs])

  useLayoutEffect(() => {
    if (positionModeRef.current !== config.appearance.position) {
      positionModeRef.current = config.appearance.position
      manualPositionRef.current = false
    }

    const placeLauncher = () => {
      const rect = morphShellRef.current?.getBoundingClientRect()
      if (!rect?.width || !rect.height) return
      const bounds = readLauncherBounds()
      setLauncherPosition((current) => {
        if (manualPositionRef.current && current) {
          return {
            x: Math.min(Math.max(bounds.left + 12, current.x), bounds.right - rect.width - 12),
            y: Math.min(Math.max(bounds.top + 12, current.y), bounds.bottom - rect.height - 12)
          }
        }
        return {
          x: config.appearance.position === 'left'
            ? bounds.left + 12
            : config.appearance.position === 'right'
              ? bounds.right - rect.width - 12
              : bounds.left + (bounds.width - rect.width) / 2,
          y: config.appearance.position === 'center'
            ? bounds.top + (bounds.height - rect.height) / 2
            : bounds.bottom - rect.height - 12
        }
      })
    }
    placeLauncher()
    window.addEventListener('resize', placeLauncher)
    window.visualViewport?.addEventListener('resize', placeLauncher)
    return () => {
      window.removeEventListener('resize', placeLauncher)
      window.visualViewport?.removeEventListener('resize', placeLauncher)
    }
  }, [config.appearance.position])

  useEffect(() => {
    if (!launcherVisible) return
    const timer = window.setTimeout(() => setLauncherSettled(true), 900)
    return () => window.clearTimeout(timer)
  }, [launcherVisible])

  useEffect(
    () => () => {
      clearTimers()
    },
    [clearTimers]
  )

  const startOpeningMorph = useCallback(
    (promptShell: HTMLDivElement) => {
      if (phaseRef.current !== 'opening-mask' || !openingLauncherRectRef.current) return
      const openRect = readRect(promptShell)
      if (openRect.width <= 0 || openRect.height <= 0) return

      setMorphGeometry({
        closed: openingLauncherRectRef.current,
        open: openRect
      })
      setMorphExpanded(false)
      updatePhase('opening-morph')
      schedule(() => setMorphExpanded(true), 34)
    },
    [schedule, updatePhase]
  )

  const handlePromptReady = useCallback(
    (element: HTMLDivElement) => {
      promptShellRef.current = element
      const currentPhase = phaseRef.current
      if (currentPhase === 'opening-mask') {
        requestAnimationFrame(() => startOpeningMorph(element))
        return
      }
      if (
        currentPhase !== 'opening-controls' &&
        currentPhase !== 'opening-welcome' &&
        currentPhase !== 'open'
      ) {
        return
      }

      const openRect = readRect(element)
      if (openRect.width <= 0 || openRect.height <= 0) return
      setMorphGeometry((current) => {
        if (!current || rectsMatch(current.open, openRect)) return current
        return { ...current, open: openRect }
      })
    },
    [startOpeningMorph]
  )

  const finishClosed = useCallback(() => {
    setMorphExpanded(false)
    setMorphGeometry(null)
    pendingCloseRef.current = false
    updatePhase('closed')
  }, [updatePhase])

  const beginClosing = useCallback(() => {
    const current = phaseRef.current
    if (current === 'closed' || current === 'closing-controls' || current === 'closing-morph') {
      return
    }

    stopRef.current()
    clearTimers()
    updatePhase('closing-controls')

    schedule(() => {
      const promptShell = promptShellRef.current
      const closedRect = openingLauncherRectRef.current
      if (!promptShell || !closedRect) {
        schedule(finishClosed, 180)
        return
      }

      setMorphGeometry({
        closed: closedRect,
        open: readRect(promptShell)
      })
      updatePhase('closing-morph')
      setMorphExpanded(false)
    }, 120)
  }, [clearTimers, finishClosed, schedule, updatePhase])

  const close = useCallback(() => {
    const current = phaseRef.current
    if (current === 'opening-mask' || current === 'opening-morph') {
      pendingCloseRef.current = true
      stopRef.current()
      return
    }
    beginClosing()
  }, [beginClosing])

  const handleStopReady = useCallback((stop: () => void) => {
    stopRef.current = stop
  }, [])

  const handleMorphComplete = useCallback(
    (direction: 'close' | 'open') => {
      if (direction === 'open' && phaseRef.current !== 'opening-morph') return
      if (direction === 'close' && phaseRef.current !== 'closing-morph') return
      if (direction === 'close') {
        finishClosed()
        return
      }

      updatePhase('opening-controls')

      if (pendingCloseRef.current) {
        pendingCloseRef.current = false
        schedule(beginClosing, 140)
        return
      }

      schedule(() => updatePhase('opening-welcome'), 440)
      schedule(() => updatePhase('open'), 760)
    },
    [beginClosing, finishClosed, schedule, updatePhase]
  )

  useEffect(() => {
    if (phase !== 'opening-morph' && phase !== 'closing-morph') return
    const direction = phase === 'opening-morph' ? 'open' : 'close'
    const fallback = window.setTimeout(() => handleMorphComplete(direction), 680)
    return () => window.clearTimeout(fallback)
  }, [handleMorphComplete, phase])

  function open() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (phaseRef.current !== 'closed') return
    const morphShell = morphShellRef.current
    if (!morphShell) return

    clearTimers()
    pendingCloseRef.current = false
    openingLauncherRectRef.current = readRect(morphShell)
    updatePhase('opening-mask')

    if (ChatPanel) return
    void import('./ChatPanel').then((module) => {
      setChatPanel(() => module.PortfolioChatPanel)
    })
  }

  function beginLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (phaseRef.current !== 'closed' || event.button !== 0) return
    const rect = morphShellRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      height: rect.height, moved: false, originX: rect.left, originY: rect.top,
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, width: rect.width
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveLauncher(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 4) return
    drag.moved = true
    manualPositionRef.current = true
    const bounds = readLauncherBounds()
    suppressClickRef.current = true
    setLauncherPosition({
      x: Math.min(Math.max(bounds.left + 12, drag.originX + deltaX), bounds.right - drag.width - 12),
      y: Math.min(Math.max(bounds.top + 12, drag.originY + deltaY), bounds.bottom - drag.height - 12)
    })
  }

  function endLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      const rect = morphShellRef.current?.getBoundingClientRect()
      if (!rect) return
      window.dispatchEvent(new CustomEvent('portable-chatbot:launcher-position', {
        detail: {
          height: rect.height,
          left: rect.left,
          moved: manualPositionRef.current,
          phase: phaseRef.current,
          top: rect.top,
          width: rect.width
        }
      }))
    })
    return () => cancelAnimationFrame(frame)
  }, [launcherPosition, launcherVisible, phase])

  useEffect(() => {
    if (!overlayMounted) return

    let frame = 0
    const syncGeometry = () => {
      frame = 0
      const currentPhase = phaseRef.current
      const promptShell = promptShellRef.current
      const morphShell = morphShellRef.current
      const launcher = launcherRef.current
      if (
        !promptShell ||
        !morphShell ||
        !launcher ||
        currentPhase === 'closed' ||
        currentPhase === 'closing-morph'
      ) {
        return
      }

      const openRect = readRect(promptShell)
      const launcherRect = readRect(launcher)
      if (openRect.width <= 0 || openRect.height <= 0 || launcherRect.width <= 0) return

      const styles = window.getComputedStyle(morphShell)
      const right = Number.parseFloat(styles.right) || 0
      const bottom = Number.parseFloat(styles.bottom) || 0
      const closedRect: MotionRect = launcherPosition ? {
        height: launcherRect.height,
        left: launcherPosition.x,
        top: launcherPosition.y,
        width: launcherRect.width
      } : {
        height: launcherRect.height,
        left: window.innerWidth - right - launcherRect.width,
        top: window.innerHeight - bottom - launcherRect.height,
        width: launcherRect.width
      }

      openingLauncherRectRef.current = closedRect
      setMorphGeometry((current) => {
        if (current && rectsMatch(current.closed, closedRect) && rectsMatch(current.open, openRect)) {
          return current
        }
        return { closed: closedRect, open: openRect }
      })
    }
    const scheduleSync = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(syncGeometry)
    }

    scheduleSync()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleSync)
    if (promptShellRef.current) resizeObserver?.observe(promptShellRef.current)
    window.addEventListener('resize', scheduleSync)
    window.visualViewport?.addEventListener('resize', scheduleSync)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleSync)
      window.visualViewport?.removeEventListener('resize', scheduleSync)
    }
  }, [launcherPosition, overlayMounted, phase])

  useEffect(() => {
    if (!overlayMounted) return
    const previousOverflow = document.body.style.overflow
    const inertElements = overlayScope === 'host'
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-chatbot-drag-bounds]'))
      : Array.from(document.querySelectorAll<HTMLElement>('[data-chatbot-host-content]'))
    const previousInertStates = inertElements.map((element) => element.inert)
    inertElements.forEach((element) => {
      element.inert = true
    })
    if (overlayScope === 'viewport') document.body.style.overflow = 'hidden'

    return () => {
      inertElements.forEach((element, index) => {
        element.inert = previousInertStates[index]
      })
      document.body.style.overflow = previousOverflow
      launcherRef.current?.focus()
    }
  }, [overlayMounted, overlayScope])

  useEffect(() => {
    if (!overlayMounted) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [close, overlayMounted])

  useEffect(() => {
    if (phase !== 'opening-controls') return
    dialogRef.current?.focus({ preventScroll: true })
    const frame = requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [phase])

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return

    const dialogFocusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    )
    const composerFocusable = Array.from(
      morphShellRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((element) => element !== launcherRef.current)
    const focusable = [...composerFocusable, ...dialogFocusable]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <GlassSurface
        borderRadius={999}
        className={`chatbot-morph${launcherVisible ? ' is-visible' : ''}${launcherSettled ? ' is-settled' : ''}`}
        data-locale={locale}
        data-motion={config.appearance.motion}
        data-open={morphExpanded}
        data-position={config.appearance.position}
        data-phase={phase}
        onTransitionEnd={(event) => {
          if (event.currentTarget !== event.target || event.propertyName !== 'width') return
          if (phaseRef.current === 'opening-morph') handleMorphComplete('open')
          if (phaseRef.current === 'closing-morph') handleMorphComplete('close')
        }}
        ref={handleComposerHost}
        style={{
          ...morphStyle(morphGeometry),
          ...(launcherPosition && !morphExpanded ? { bottom: 'auto', left: launcherPosition.x, right: 'auto', top: launcherPosition.y } : null)
        }}
      >
        <button
          aria-expanded={overlayMounted}
          aria-label={locale === 'zh' ? '打开 AI 助手' : 'Open AI assistant'}
          className="chatbot-launcher"
          data-phase={phase}
          onPointerCancel={endLauncherDrag}
          onPointerDown={beginLauncherDrag}
          onPointerMove={moveLauncher}
          onPointerUp={endLauncherDrag}
          onClick={open}
          ref={launcherRef}
          tabIndex={overlayMounted ? -1 : undefined}
          type="button"
        >
          <span className="chatbot-launcher__content">
            <img alt="" aria-hidden="true" src={withBasePath(config.launcher.iconUrl)} />
            <span>{config.launcher.label[locale]}</span>
          </span>
        </button>
      </GlassSurface>

      {overlayMounted ? (
        <div
          className="chatbot-overlay"
          data-lenis-prevent="true"
          data-locale={locale}
          data-motion={config.appearance.motion}
          data-phase={phase}
          data-scope={overlayScope}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
          style={overlayScope === 'host' && overlayBounds ? {
            bottom: 'auto',
            height: overlayBounds.height,
            left: overlayBounds.left,
            right: 'auto',
            top: overlayBounds.top,
            width: overlayBounds.width
          } : undefined}
        >
          <div
            aria-label={locale === 'zh' ? 'AI 助手对话' : 'AI assistant chat'}
            aria-modal="true"
            aria-owns="portfolio-chatbot-composer"
            className="chatbot-panel"
            onKeyDown={handleDialogKeyDown}
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            {ChatPanel ? (
              <ChatPanel
                apiEndpoint={apiEndpoint}
                composerHost={composerHost}
                config={config}
                locale={locale}
                onClose={close}
                onPromptReady={handlePromptReady}
                onStopReady={handleStopReady}
                transitionPhase={phase}
              />
            ) : (
              <div className="chatbot-panel__loading" aria-live="polite">
                {locale === 'zh' ? '正在加载对话…' : 'Loading chat…'}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
