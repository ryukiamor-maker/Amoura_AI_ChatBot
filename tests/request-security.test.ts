import { afterEach, describe, expect, it } from 'vitest'

import { isAllowedOrigin, isSameOriginRequest } from '@/lib/request-security'

const OLD_ALLOWED = process.env.CHATBOT_ALLOWED_ORIGINS

function setAllowedOrigins(origins: string) {
  process.env.CHATBOT_ALLOWED_ORIGINS = origins
}

function clearAllowedOrigins() {
  delete process.env.CHATBOT_ALLOWED_ORIGINS
}

describe('isAllowedOrigin', () => {
  afterEach(() => {
    if (OLD_ALLOWED !== undefined) {
      process.env.CHATBOT_ALLOWED_ORIGINS = OLD_ALLOWED
    } else {
      clearAllowedOrigins()
    }
  })

  it('accepts matching origin and host (same-origin)', () => {
    clearAllowedOrigins()
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        }),
      ),
    ).toBe(true)
  })

  it('rejects absent and cross-origin headers (no whitelist)', () => {
    clearAllowedOrigins()
    expect(isAllowedOrigin(new Request('http://localhost/api'))).toBe(false)
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000', origin: 'https://example.com' },
        }),
      ),
    ).toBe(false)
  })

  it('accepts cross-origin when origin is in whitelist', () => {
    setAllowedOrigins('https://lab.amoura.design')
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'amoura-ai-chatbot.vercel.app', origin: 'https://lab.amoura.design' },
        }),
      ),
    ).toBe(true)
  })

  it('rejects cross-origin when origin is NOT in whitelist', () => {
    setAllowedOrigins('https://lab.amoura.design')
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'amoura-ai-chatbot.vercel.app', origin: 'https://evil.example.com' },
        }),
      ),
    ).toBe(false)
  })

  it('rejects malformed origins', () => {
    setAllowedOrigins('https://lab.amoura.design')
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000', origin: 'not-a-url' },
        }),
      ),
    ).toBe(false)
  })

  it('rejects absent origin header', () => {
    setAllowedOrigins('https://lab.amoura.design')
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000' },
        }),
      ),
    ).toBe(false)
  })

  it('handles multiple whitelisted origins', () => {
    setAllowedOrigins('https://lab.amoura.design,https://amoura.design')
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'chatbot.vercel.app', origin: 'https://amoura.design' },
        }),
      ),
    ).toBe(true)
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'chatbot.vercel.app', origin: 'https://lab.amoura.design' },
        }),
      ),
    ).toBe(true)
    expect(
      isAllowedOrigin(
        new Request('http://localhost/api', {
          headers: { host: 'chatbot.vercel.app', origin: 'https://other.example.com' },
        }),
      ),
    ).toBe(false)
  })
})

describe('isSameOriginRequest (backward compat)', () => {
  it('accepts matching origin and host', () => {
    expect(
      isSameOriginRequest(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
        }),
      ),
    ).toBe(true)
  })

  it('rejects absent and cross-origin headers', () => {
    expect(isSameOriginRequest(new Request('http://localhost/api'))).toBe(false)
    expect(
      isSameOriginRequest(
        new Request('http://localhost/api', {
          headers: { host: 'localhost:3000', origin: 'https://example.com' },
        }),
      ),
    ).toBe(false)
  })
})
