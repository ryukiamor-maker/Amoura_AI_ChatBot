import { describe, expect, it } from 'vitest'

import { isSameOriginRequest } from '@/lib/request-security'

describe('same-origin guard', () => {
  it('accepts matching origin and host', () => {
    expect(isSameOriginRequest(new Request('http://localhost/api', { headers: { host: 'localhost:3000', origin: 'http://localhost:3000' } }))).toBe(true)
  })

  it('rejects absent and cross-origin headers', () => {
    expect(isSameOriginRequest(new Request('http://localhost/api'))).toBe(false)
    expect(isSameOriginRequest(new Request('http://localhost/api', { headers: { host: 'localhost:3000', origin: 'https://example.com' } }))).toBe(false)
  })
})
