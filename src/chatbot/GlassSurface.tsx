'use client'

import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode
} from 'react'

import './GlassSurface.css'

export type GlassSurfaceProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'className' | 'style'
> & {
  backgroundOpacity?: number
  blur?: number
  borderRadius?: number
  brightness?: number
  children?: ReactNode
  className?: string
  height?: number | string
  style?: CSSProperties
  width?: number | string
}

function dimension(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * A solid, resize-safe surface used by the expandable launcher.
 */
export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  function GlassSurface(
    {
      borderRadius = 20,
      children,
      className = '',
      height,
      style = {},
      width,
      ...rootProps
    },
    forwardedRef
  ) {
    const containerStyle: CSSProperties = {
      borderRadius,
      ...(height === undefined ? null : { height: dimension(height) }),
      ...(width === undefined ? null : { width: dimension(width) }),
      ...style
    }

    return (
      <div
        {...rootProps}
        className={`glass-surface ${className}`.trim()}
        ref={forwardedRef}
        style={containerStyle}
      >
        <div className="glass-surface__content">{children}</div>
      </div>
    )
  }
)
