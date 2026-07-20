import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { isWelcomePlaybackReady } from '@/chatbot/ChatPanel'
import { StreamingText } from '@/chatbot/core/StreamingText'

describe('welcome playback timing', () => {
  it('waits until the opening sequence is fully open', () => {
    expect(isWelcomePlaybackReady('opening-morph')).toBe(false)
    expect(isWelcomePlaybackReady('opening-controls')).toBe(false)
    expect(isWelcomePlaybackReady('opening-welcome')).toBe(false)
    expect(isWelcomePlaybackReady('open')).toBe(true)
  })

  it('mounts at zero visible words and starts from the first word', async () => {
    vi.useFakeTimers()
    const { container } = render(
      <StreamingText delay={60} speed={62} streamKey="welcome-test" text="First second third" />
    )
    const output = container.querySelector('.streaming-text')
    expect(output).toHaveAttribute('data-visible-count', '0')
    expect(output).toHaveTextContent('')
    expect(output).toHaveAttribute('aria-label', 'First second third')
    await act(async () => { vi.advanceTimersByTime(122) })
    expect(output).toHaveAttribute('data-visible-count', '1')
    vi.useRealTimers()
  })
})
