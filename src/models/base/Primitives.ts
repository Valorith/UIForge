/**
 * Base primitive types used throughout the EQ UI system
 */

/** RGB color with alpha channel (all values 0-255) */
export interface RGB {
  alpha: number
  r: number
  g: number
  b: number
}

/** 2D point coordinates */
export interface Point {
  x: number
  y: number
}

/** Size dimensions (CX = width, CY = height in EQ terminology) */
export interface Size {
  cx: number
  cy: number
}

/** Rectangle combining location and size */
export interface Rectangle {
  location: Point
  size: Size
}

/** Default values */
export const DEFAULT_RGB: RGB = { alpha: 255, r: 255, g: 255, b: 255 }
export const DEFAULT_POINT: Point = { x: 0, y: 0 }
export const DEFAULT_SIZE: Size = { cx: 0, cy: 0 }

/** Helper functions */
export function createRGB(r: number, g: number, b: number, alpha = 255): RGB {
  return { alpha, r, g, b }
}

export function rgbToHex(color: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}

export function hexToRGB(hex: string, alpha = 255): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return DEFAULT_RGB
  return {
    alpha,
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

export function rgbToCss(color: RGB): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.alpha / 255})`
}

export function pointEquals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

export function sizeEquals(a: Size, b: Size): boolean {
  return a.cx === b.cx && a.cy === b.cy
}

export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y }
}

export function cloneSize(s: Size): Size {
  return { cx: s.cx, cy: s.cy }
}

export function cloneRGB(c: RGB): RGB {
  return { alpha: c.alpha, r: c.r, g: c.g, b: c.b }
}
