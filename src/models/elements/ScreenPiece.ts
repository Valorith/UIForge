/**
 * Core UI element types based on EQ's SIDL schema
 */

import type { Point, Size, RGB } from '../base/Primitives'

/** Style flags that can be applied to UI elements */
export interface StyleFlags {
  transparent?: boolean
  border?: boolean
  titlebar?: boolean
  closebox?: boolean
  minimizebox?: boolean
  tilebox?: boolean
  sizable?: boolean
  escapeClose?: boolean
  checkbox?: boolean // For Button type
  vScroll?: boolean
  hScroll?: boolean
  autoVScroll?: boolean
  autoHScroll?: boolean
  relativeTo?: boolean
  ignoreClick?: boolean
}

/** Base interface for all screen pieces */
export interface ScreenPiece {
  // Identity
  id: string // Internal unique ID for the editor
  type: string // ElementType name from SIDL
  screenId: string // ScreenID from XML (unique within parent)
  item?: string // Named reference (item attribute)

  // Positioning
  location: Point
  size: Size
  relativePosition: boolean
  autoStretch: boolean

  // Anchoring system
  topAnchorToTop: boolean
  bottomAnchorToTop: boolean
  leftAnchorToLeft: boolean
  rightAnchorToLeft: boolean
  topAnchorOffset: number
  bottomAnchorOffset: number
  leftAnchorOffset: number
  rightAnchorOffset: number

  // Appearance
  textColor?: RGB
  disabledColor?: RGB
  font?: number // 0-6 scale
  text?: string
  tooltip?: string

  // Style flags
  style: StyleFlags

  // Layout Properties (TileLayoutBox, etc.)
  spacing?: number
  secondarySpacing?: number
  horizontalFirst?: boolean
  anchorToTop?: boolean
  anchorToLeft?: boolean
  firstPieceTemplate?: boolean
  snapToChildren?: boolean
  isReferenced?: boolean // True if this piece is used as a child of another piece
  columns?: number[]

  // Template references
  drawTemplate?: string

  // Hierarchy
  children: ScreenPiece[]
  parentId?: string // Reference to parent's id

  // Source tracking
  sourceFile?: string // Which EQUI file this came from
}

/** Create a default ScreenPiece */
export function createDefaultScreenPiece(
  type: string,
  screenId: string,
  id?: string
): ScreenPiece {
  return {
    id: id ?? generateId(),
    type,
    screenId,
    location: { x: 0, y: 0 },
    size: { cx: 100, cy: 100 },
    relativePosition: false,
    autoStretch: false,
    topAnchorToTop: true,
    bottomAnchorToTop: false,
    leftAnchorToLeft: true,
    rightAnchorToLeft: false,
    topAnchorOffset: 0,
    bottomAnchorOffset: 0,
    leftAnchorOffset: 0,
    rightAnchorOffset: 0,
    style: {},
    children: [],
  }
}

/** Generate a unique ID for editor use */
let idCounter = 0
export function generateId(): string {
  return `elem_${Date.now()}_${idCounter++}`
}

/** Clone a ScreenPiece (deep copy) */
export function cloneScreenPiece(piece: ScreenPiece): ScreenPiece {
  return {
    ...piece,
    id: generateId(),
    location: { ...piece.location },
    size: { ...piece.size },
    textColor: piece.textColor ? { ...piece.textColor } : undefined,
    disabledColor: piece.disabledColor ? { ...piece.disabledColor } : undefined,
    style: { ...piece.style },
    children: piece.children.map(cloneScreenPiece),
  }
}

/** Check if element contains a point (for hit testing) */
export function containsPoint(piece: ScreenPiece, point: Point): boolean {
  const { x, y } = piece.location
  const { cx, cy } = piece.size
  return (
    point.x >= x &&
    point.x <= x + cx &&
    point.y >= y &&
    point.y <= y + cy
  )
}

/** Get the bounding rectangle of an element */
export function getBounds(piece: ScreenPiece): {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
} {
  return {
    left: piece.location.x,
    top: piece.location.y,
    right: piece.location.x + piece.size.cx,
    bottom: piece.location.y + piece.size.cy,
    width: piece.size.cx,
    height: piece.size.cy,
  }
}
