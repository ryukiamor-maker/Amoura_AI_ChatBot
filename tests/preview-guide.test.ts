import { describe, expect, it } from 'vitest'

import { getLauncherGuideLayout } from '@/components/PreviewExperience'

describe('preview launcher guide layout', () => {
  it('anchors the guide to the launcher top center at different window layouts', () => {
    const compact = getLauncherGuideLayout({ height: 44, left: 320, phase: 'closed', top: 346, width: 192 })
    const wide = getLauncherGuideLayout({ height: 44, left: 976, phase: 'closed', top: 574, width: 96 })

    expect(compact).toMatchObject({ placement: 'above', style: { left: 416, top: 346 } })
    expect(wide).toMatchObject({ placement: 'above', style: { left: 1024, top: 574 } })
  })

  it('moves the guide below the launcher when there is not enough room above', () => {
    const layout = getLauncherGuideLayout({ height: 44, left: 100, phase: 'closed', top: 60, width: 96 })
    expect(layout).toMatchObject({ placement: 'below', style: { left: 148, top: 104 } })
  })
})
