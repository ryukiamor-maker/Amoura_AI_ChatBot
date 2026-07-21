'use client'

import { Languages, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { ChatbotWidget, type ChatbotConfig, type ChatLocale } from '@/chatbot'
import { withBasePath } from '@/lib/base-path'

type LauncherGuideRect = {
  height: number
  left: number
  phase: string
  top: number
  width: number
}

export function getLauncherGuideLayout(launcher: LauncherGuideRect) {
  const placement = launcher.top < 92 ? 'below' as const : 'above' as const
  return {
    placement,
    style: {
      left: launcher.left + launcher.width / 2,
      top: placement === 'above' ? launcher.top : launcher.top + launcher.height
    } as CSSProperties
  }
}

export function PreviewExperience({ canConfigure, config }: { config: ChatbotConfig; canConfigure: boolean }) {
  const [locale, setLocale] = useState<ChatLocale>(config.defaultLocale)
  const guideDismissedRef = useRef(false)
  const guideRef = useRef<HTMLDivElement>(null)
  const previewConfig: ChatbotConfig = {
    ...config,
    appearance: { ...config.appearance, position: 'center' }
  }

  useEffect(() => {
    let frame = 0
    let trackingUntil = 0
    let observer: MutationObserver | null = null

    const measure = () => {
      const element = document.querySelector<HTMLElement>('.chatbot-morph')
      const guide = guideRef.current
      if (!element || !guide) return
      const rect = element.getBoundingClientRect()
      const width = element.offsetWidth || rect.width
      const height = element.offsetHeight || rect.height
      if (!width || !height) return
      const launcher = {
        height,
        left: element.offsetLeft,
        phase: element.dataset.phase || 'closed',
        top: element.offsetTop,
        width
      }
      const layout = getLauncherGuideLayout(launcher)
      guide.style.left = `${layout.style.left}px`
      guide.style.top = `${layout.style.top}px`
      guide.dataset.placement = layout.placement
      guide.dataset.visible = String(
        !guideDismissedRef.current &&
        launcher.phase === 'closed' &&
        element.classList.contains('is-visible') &&
        element.classList.contains('is-settled')
      )
    }

    const scheduleMeasure = () => {
      trackingUntil = Date.now() + 1800
      if (frame) return
      const track = () => {
        frame = 0
        measure()
        // Keep measuring briefly while responsive layout and the launcher's
        // own position state settle. This also covers viewport resize streams
        // that arrive as several incremental sizes in embedded browsers.
        if (Date.now() < trackingUntil) frame = requestAnimationFrame(track)
      }
      frame = requestAnimationFrame(track)
    }

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ height: number; left: number; moved: boolean; phase: string; top: number; width: number }>).detail
      if (detail.moved) {
        guideDismissedRef.current = true
        if (guideRef.current) guideRef.current.dataset.visible = 'false'
        return
      }
      scheduleMeasure()
    }

    window.addEventListener('portable-chatbot:launcher-position', sync)
    window.addEventListener('resize', scheduleMeasure)
    window.visualViewport?.addEventListener('resize', scheduleMeasure)
    window.visualViewport?.addEventListener('scroll', scheduleMeasure)
    scheduleMeasure()

    const observeLauncher = () => {
      const element = document.querySelector<HTMLElement>('.chatbot-morph')
      if (!element) {
        frame = requestAnimationFrame(observeLauncher)
        return
      }
      observer = new MutationObserver(scheduleMeasure)
      observer.observe(element, { attributeFilter: ['class', 'data-phase', 'style'], attributes: true })
      scheduleMeasure()
    }
    observeLauncher()

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('portable-chatbot:launcher-position', sync)
      window.removeEventListener('resize', scheduleMeasure)
      window.visualViewport?.removeEventListener('resize', scheduleMeasure)
      window.visualViewport?.removeEventListener('scroll', scheduleMeasure)
    }
  }, [])

  return (
    <>
      <main className="preview-blank" data-chatbot-drag-bounds data-chatbot-host-content>
        <div className="preview-page-actions">
          <button aria-label={locale === 'zh' ? '切换到英文' : 'Switch to Chinese'} className="preview-language-toggle" onClick={() => setLocale((value) => value === 'zh' ? 'en' : 'zh')} type="button"><Languages size={14} />{locale === 'zh' ? 'EN' : '中文'}</button>
          {canConfigure ? <Link className="preview-config-link" href="/config"><Settings2 size={14} />{locale === 'zh' ? '配置' : 'Configuration'}</Link> : null}
        </div>
        <div
          className="preview-guide"
          aria-hidden="true"
          data-placement="above"
          data-visible="false"
          ref={guideRef}
        >
          <span>{locale === 'zh' ? '拖动按钮调整位置，点击开始' : 'Drag to position · click to begin'}</span>
          <img alt="" src={withBasePath('/assets/preview/cloud-click-arrow.svg')} />
        </div>
      </main>
      <ChatbotWidget config={previewConfig} locale={locale} overlayScope="host" />
    </>
  )
}
