'use client'

import { BriefcaseBusiness, Check, Link2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import type { ChatbotConfig, ChatLocale } from '../schema'
import type { ChatMessage } from '../types'

export type PortfolioToolPart = Extract<ChatMessage['parts'][number], { type: `tool-${string}` }>

const CARD_COPY = {
  en: {
    aiFeatures: [
      ['feature-component.svg', 'Diverse Component Ecosystem'],
      ['feature-code.svg', 'Open Source Code'],
      ['feature-drone.svg', 'Advanced Visual Effects']
    ],
    aiTitle: 'Product Experience Lab',
    background: 'Background',
    contact: 'Contact Me',
    copied: 'Copied',
    copyEmail: 'Email',
    copiedLabel: 'Email copied',
    more: 'More',
    visit: 'Visit'
  },
  zh: {
    aiFeatures: [
      ['feature-component.svg', '多样组件生态'],
      ['feature-code.svg', '开源代码'],
      ['feature-drone.svg', '高级视觉效果']
    ],
    aiTitle: '产品体验实验室',
    background: '个人经历',
    contact: '联系我',
    copied: '已复制',
    copyEmail: '复制',
    copiedLabel: '邮箱已复制',
    more: '更多',
    visit: '访问'
  }
} as const

async function writeClipboardText(text: string) {
  try { await navigator.clipboard.writeText(text) } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0'
    document.body.appendChild(textarea); textarea.select()
    const copied = document.execCommand('copy'); textarea.remove()
    if (!copied) throw new Error('Unable to copy email')
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function ContactEmailButton({ email, locale }: { email: string; locale: ChatLocale }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)
  const copy = CARD_COPY[locale]
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current) }, [])

  async function copyEmail() {
    try {
      await writeClipboardText(email); setCopied(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 3000)
    } catch { setCopied(false) }
  }

  return (
    <button aria-label={copied ? copy.copiedLabel : `${copy.copyEmail} ${email}`} className="chatbot-figma-chip chatbot-figma-contact-card__email" data-copied={copied} onClick={() => void copyEmail()} type="button">
      <span className="t-icon-swap chatbot-figma-contact-card__email-icon" data-state={copied ? 'b' : 'a'}>
        <Mail aria-hidden="true" className="t-icon" data-icon="a" size={14} />
        <Check className="t-icon" data-icon="b" size={14} aria-hidden="true" />
      </span>
      <span className="chatbot-figma-contact-card__email-label" data-copied={copied}><span data-label="a">{copy.copyEmail}</span><span data-label="b">{copy.copied}</span></span>
    </button>
  )
}

function CardChevron() {
  return <span className="t-learn-chevron" aria-hidden="true"><svg viewBox="0 0 16 16"><path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" /><path className="t-learn-arm t-learn-arm-bot" d="M10 8L6 12" /></svg></span>
}

export function PortfolioToolCard({ config, locale = 'en', part }: { config: ChatbotConfig; locale?: ChatLocale; part: PortfolioToolPart }) {
  const copy = CARD_COPY[locale]
  if (part.state === 'output-error') return <div className="chatbot-tool-card chatbot-tool-card--error" data-state="error" role="alert">{part.errorText}</div>
  if (part.state !== 'output-available') return null

  if (part.type === 'tool-showProjects') {
    return (
      <div className="chatbot-project-grid chatbot-tool-card chatbot-tool-card--projects" data-state="output" data-tool="showProjects">
        <span className="chatbot-project-grid__header"><span className="chatbot-card-heading"><span className="chatbot-card-mark" aria-hidden="true"><BriefcaseBusiness size={15} /></span><span><small>{locale === 'zh' ? '精选作品' : 'Selected work'}</small><strong>{locale === 'zh' ? '近期项目' : 'Recent projects'}</strong></span></span><span className="chatbot-card-count">{String(part.output.projects.length).padStart(2, '0')}</span></span>
        <span className="chatbot-project-deck">
          {part.output.projects.map((project, index) => (
            <Link className="chatbot-project-card t-learn" href={project.href} key={project.id}>
              <span className="chatbot-project-card__media"><span className="chatbot-project-card__mock-cover" style={{ '--mock-cover-accent': project.cover.accent } as CSSProperties}>{project.cover.eyebrow[locale]}</span><span className="chatbot-project-card__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></span>
              <span className="chatbot-project-card__body"><span className="chatbot-project-card__meta">{project.year} · {project.role[locale]}</span><strong>{project.title[locale]}</strong><span className="chatbot-project-card__summary">{project.summary[locale]}</span><span className="chatbot-project-card__tags">{project.tags[locale].map((tag) => <span key={tag}>{tag}</span>)}</span><span className="chatbot-project-card__action">{locale === 'zh' ? '查看项目' : 'View project'}<CardChevron /></span></span>
            </Link>
          ))}
        </span>
      </div>
    )
  }

  if (part.type === 'tool-showProfile') {
    const profile = part.output
    return (
      <div className="chatbot-figma-card chatbot-figma-ai-card chatbot-tool-card" data-state="output" data-tool="showProfile">
        <span className="chatbot-figma-ai-card__header chatbot-mock-ai-header" aria-hidden="true"><i /><i /><i /></span>
        <strong className="chatbot-figma-ai-card__title">{copy.aiTitle}</strong>
        <span className="chatbot-figma-ai-card__features">{profile.skills[locale].slice(0, 3).map((label, index) => <span key={label}><span aria-hidden="true" className="chatbot-mock-feature-icon">{index + 1}</span><span>{label}</span></span>)}</span>
        <span className="chatbot-figma-ai-card__footer"><span><Link2 aria-hidden="true" size={14} /><span>{profile.role[locale]}</span></span><Link className="chatbot-figma-chip t-learn" href={profile.href}>{copy.visit}<CardChevron /></Link></span>
        <span className="sr-only">{profile.name[locale]} · {profile.skills[locale].join(', ')}</span>
      </div>
    )
  }

  if (part.type === 'tool-showTimeline') {
    const timeline = part.output
    return (
      <div className="chatbot-figma-card chatbot-figma-background-card chatbot-tool-card" data-state="output" data-tool="showTimeline">
        <strong className="chatbot-figma-background-card__title">{copy.background}</strong>
        <span className="chatbot-figma-background-card__timeline">
          {timeline.items.slice(0, 3).map((item, index) => <span className="chatbot-figma-background-card__entry" key={`${item.date}-${item.title[locale]}`}><span className="chatbot-figma-background-card__date"><span aria-hidden="true" className={`chatbot-mock-date-dot${index === 0 ? ' is-primary' : ''}`} /><span>{item.date}</span></span><span className="chatbot-figma-background-card__content"><span aria-hidden="true" className="chatbot-mock-logo">{String(index + 1).padStart(2, '0')}</span><span><b>{item.title[locale]}</b><small>{locale === 'zh' ? `— ${item.detail[locale]}` : `-${item.detail[locale]}`}</small></span></span></span>)}
        </span>
        <Link className="chatbot-figma-chip chatbot-figma-background-card__more t-learn" href={timeline.href}>{copy.more}<CardChevron /></Link>
      </div>
    )
  }

  if (part.type === 'tool-showContact') {
    const contact = part.output
    return (
      <div className="chatbot-figma-card chatbot-figma-contact-card chatbot-tool-card" data-state="output" data-tool="showContact">
        <span className="chatbot-figma-contact-card__header chatbot-mock-contact-header" aria-hidden="true" />
        <strong className="chatbot-figma-contact-card__title">{copy.contact}</strong>
        <span className="chatbot-figma-contact-card__avatar chatbot-mock-avatar" aria-hidden="true">{initials(config.profile.name[locale])}</span>
        <span className="chatbot-figma-contact-card__identity"><strong>{config.profile.name[locale]}</strong><span>{locale === 'zh' ? '产品设计师' : 'Product Designer'}</span></span>
        <ContactEmailButton email={contact.email} locale={locale} />
      </div>
    )
  }

  if (part.type === 'tool-showLocation') {
    const location = part.output
    return (
      <a className="chatbot-figma-card chatbot-figma-location-card chatbot-tool-card" data-state="output" data-tool="showLocation" href={location.mapUrl} rel="noreferrer" target="_blank">
        <span className="chatbot-figma-location-card__map chatbot-mock-map" aria-hidden="true"><i /><i /><i /></span>
        <span className="chatbot-figma-location-card__details"><strong>{location.city[locale]}</strong><span>{location.country[locale]}</span></span>
      </a>
    )
  }
  return null
}
