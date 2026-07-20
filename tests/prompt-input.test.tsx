import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ChatPromptInput } from '@/chatbot/core/ChatPromptInput'
import { clearChatSession } from '@/chatbot/session'

describe('chat prompt input', () => {
  it('does not send Enter while an IME composition is active', () => {
    clearChatSession()
    const onSend = vi.fn()
    render(<ChatPromptInput assistantName="演示" locale="zh" onSend={onSend} onStop={vi.fn()} portalTarget={null} status="ready" />)
    const input = screen.getByLabelText('向 AI 助手提问')
    fireEvent.change(input, { target: { value: '你好' } })
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('你好')
  })

  it('supports Safari keyCode 229 protection and Shift+Enter', () => {
    const onSend = vi.fn()
    render(<ChatPromptInput assistantName="Demo" locale="en" onSend={onSend} onStop={vi.fn()} portalTarget={null} status="ready" />)
    const input = screen.getByLabelText('Ask the AI twin')
    fireEvent.change(input, { target: { value: 'Draft' } })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })
})
