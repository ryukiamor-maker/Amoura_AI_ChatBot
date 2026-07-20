import configJson from '../content/chatbot-config.json'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatbotWidget } from '@/chatbot/ChatbotWidget'
import { chatbotConfigSchema } from '@/chatbot/schema'

describe('draggable launcher', () => {
  it('moves freely without opening the dialog', async () => {
    vi.useFakeTimers()
    const config = chatbotConfigSchema.parse({
      ...configJson,
      appearance: { ...configJson.appearance, launcherDelayMs: 0, motion: 'reduced' }
    })
    const rect = { bottom: 144, height: 44, left: 100, right: 196, toJSON: () => ({}), top: 100, width: 96, x: 100, y: 100 }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect as DOMRect)
    render(<ChatbotWidget config={config} locale="en" />)
    await act(async () => { vi.runAllTimers() })
    const launcher = screen.getByRole('button', { name: 'Open AI assistant' })
    fireEvent.pointerDown(launcher, { button: 0, clientX: 120, clientY: 120, pointerId: 7 })
    fireEvent.pointerMove(launcher, { clientX: 320, clientY: 420, pointerId: 7 })
    fireEvent.pointerUp(launcher, { clientX: 320, clientY: 420, pointerId: 7 })
    const shell = launcher.closest('.chatbot-morph') as HTMLElement
    expect(shell.style.left).toBe('300px')
    expect(shell.style.top).toBe('400px')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('stays inside the configured preview canvas and reports that the guide should dismiss', async () => {
    vi.useFakeTimers()
    const config = chatbotConfigSchema.parse({
      ...configJson,
      appearance: { ...configJson.appearance, launcherDelayMs: 0, motion: 'reduced' }
    })
    const launcherRect = { bottom: 144, height: 44, left: 100, right: 196, toJSON: () => ({}), top: 100, width: 96, x: 100, y: 100 }
    const boundsRect = { bottom: 400, height: 320, left: 50, right: 500, toJSON: () => ({}), top: 80, width: 450, x: 50, y: 80 }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return (this.hasAttribute('data-chatbot-drag-bounds') ? boundsRect : launcherRect) as DOMRect
    })
    const positionEvents: Array<{ moved: boolean }> = []
    const listener = (event: Event) => positionEvents.push((event as CustomEvent<{ moved: boolean }>).detail)
    window.addEventListener('portable-chatbot:launcher-position', listener)
    render(<><main data-chatbot-drag-bounds /><ChatbotWidget config={config} locale="en" /></>)
    await act(async () => { vi.runAllTimers() })
    const launcher = screen.getByRole('button', { name: 'Open AI assistant' })
    fireEvent.pointerDown(launcher, { button: 0, clientX: 120, clientY: 120, pointerId: 8 })
    fireEvent.pointerMove(launcher, { clientX: 1120, clientY: 1120, pointerId: 8 })
    fireEvent.pointerUp(launcher, { clientX: 1120, clientY: 1120, pointerId: 8 })
    await act(async () => { vi.runAllTimers() })
    const shell = launcher.closest('.chatbot-morph') as HTMLElement
    expect(shell.style.left).toBe('392px')
    expect(shell.style.top).toBe('344px')
    expect(positionEvents.some((detail) => detail.moved)).toBe(true)
    window.removeEventListener('portable-chatbot:launcher-position', listener)
    vi.useRealTimers()
  })
})
