/**
 * XML Serializer
 *
 * Converts typed model objects back to EQ-compatible XML.
 */

import type { Point, Size, RGB } from '@/models/base/Primitives'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'
import type { Screen } from '@/models/elements/Controls'
import type { UIFile } from '@/models/project/Project'

/**
 * Serialize a UIFile back to XML string
 */
export function serializeUIFile(file: UIFile): string {
  const lines: string[] = []

  lines.push('<?xml version="1.0" encoding="utf-8"?>')
  lines.push('<XML>')
  lines.push('')

  // Serialize each screen
  for (const screen of file.screens) {
    serializeScreen(screen, lines, 1)
    lines.push('')
  }

  lines.push('</XML>')

  return lines.join('\n')
}

/**
 * Serialize a Screen element
 */
function serializeScreen(screen: Screen, lines: string[], indent: number): void {
  const ind = '  '.repeat(indent)

  lines.push(`${ind}<Screen${screen.item ? ` item="${screen.item}"` : ''}>`)

  // Core properties
  serializeProperty(lines, indent + 1, 'ScreenID', screen.screenId)
  serializePoint(lines, indent + 1, 'Location', screen.location)
  serializeSize(lines, indent + 1, 'Size', screen.size)

  // Positioning
  if (screen.relativePosition) {
    serializeProperty(lines, indent + 1, 'RelativePosition', 'true')
  }
  if (screen.autoStretch) {
    serializeProperty(lines, indent + 1, 'AutoStretch', 'true')
  }

  // Anchoring (only serialize non-default values)
  if (!screen.topAnchorToTop) {
    serializeProperty(lines, indent + 1, 'TopAnchorToTop', 'false')
  }
  if (screen.bottomAnchorToTop) {
    serializeProperty(lines, indent + 1, 'BottomAnchorToTop', 'true')
  }
  if (!screen.leftAnchorToLeft) {
    serializeProperty(lines, indent + 1, 'LeftAnchorToLeft', 'false')
  }
  if (screen.rightAnchorToLeft) {
    serializeProperty(lines, indent + 1, 'RightAnchorToLeft', 'true')
  }

  // Offsets (only if non-zero)
  if (screen.topAnchorOffset) {
    serializeProperty(lines, indent + 1, 'TopOffset', screen.topAnchorOffset)
  }
  if (screen.bottomAnchorOffset) {
    serializeProperty(lines, indent + 1, 'BottomOffset', screen.bottomAnchorOffset)
  }
  if (screen.leftAnchorOffset) {
    serializeProperty(lines, indent + 1, 'LeftOffset', screen.leftAnchorOffset)
  }
  if (screen.rightAnchorOffset) {
    serializeProperty(lines, indent + 1, 'RightOffset', screen.rightAnchorOffset)
  }

  // Appearance
  if (screen.textColor) {
    serializeRGB(lines, indent + 1, 'TextColor', screen.textColor)
  }
  if (screen.font) {
    serializeProperty(lines, indent + 1, 'Font', screen.font)
  }
  if (screen.text) {
    serializeProperty(lines, indent + 1, 'Text', screen.text)
  }
  if (screen.tooltip) {
    serializeProperty(lines, indent + 1, 'TooltipReference', screen.tooltip)
  }

  // Style flags
  serializeStyleFlags(lines, indent + 1, screen.style)

  // Templates
  if (screen.drawTemplate) {
    serializeProperty(lines, indent + 1, 'DrawTemplate', screen.drawTemplate)
  }
  if (screen.windowDrawTemplate) {
    serializeProperty(lines, indent + 1, 'WindowDrawTemplate', screen.windowDrawTemplate)
  }

  // Children
  for (const child of screen.children) {
    lines.push('')
    serializeScreenPiece(child, lines, indent + 1)
  }

  lines.push(`${ind}</Screen>`)
}

/**
 * Serialize a ScreenPiece element
 */
function serializeScreenPiece(piece: ScreenPiece, lines: string[], indent: number): void {
  const ind = '  '.repeat(indent)

  lines.push(`${ind}<${piece.type}${piece.item ? ` item="${piece.item}"` : ''}>`)

  // Core properties
  serializeProperty(lines, indent + 1, 'ScreenID', piece.screenId)
  serializePoint(lines, indent + 1, 'Location', piece.location)
  serializeSize(lines, indent + 1, 'Size', piece.size)

  // Positioning (only non-defaults)
  if (piece.relativePosition) {
    serializeProperty(lines, indent + 1, 'RelativePosition', 'true')
  }
  if (piece.autoStretch) {
    serializeProperty(lines, indent + 1, 'AutoStretch', 'true')
  }

  // Appearance
  if (piece.textColor) {
    serializeRGB(lines, indent + 1, 'TextColor', piece.textColor)
  }
  if (piece.font) {
    serializeProperty(lines, indent + 1, 'Font', piece.font)
  }
  if (piece.text) {
    serializeProperty(lines, indent + 1, 'Text', piece.text)
  }
  if (piece.tooltip) {
    serializeProperty(lines, indent + 1, 'TooltipReference', piece.tooltip)
  }

  // Style flags
  serializeStyleFlags(lines, indent + 1, piece.style)

  // Templates
  if (piece.drawTemplate) {
    serializeProperty(lines, indent + 1, 'DrawTemplate', piece.drawTemplate)
  }

  // Control-specific properties
  if ('eqType' in piece && piece.eqType) {
    serializeProperty(lines, indent + 1, 'EQType', piece.eqType)
  }

  // Children
  for (const child of piece.children) {
    lines.push('')
    serializeScreenPiece(child, lines, indent + 1)
  }

  lines.push(`${ind}</${piece.type}>`)
}

// ============ Helper Functions ============

function serializeProperty(
  lines: string[],
  indent: number,
  name: string,
  value: string | number | boolean
): void {
  const ind = '  '.repeat(indent)
  lines.push(`${ind}<${name}>${value}</${name}>`)
}

function serializePoint(lines: string[], indent: number, name: string, point: Point): void {
  if (point.x === 0 && point.y === 0) return

  const ind = '  '.repeat(indent)
  lines.push(`${ind}<${name}>`)
  lines.push(`${ind}  <X>${point.x}</X>`)
  lines.push(`${ind}  <Y>${point.y}</Y>`)
  lines.push(`${ind}</${name}>`)
}

function serializeSize(lines: string[], indent: number, name: string, size: Size): void {
  if (size.cx === 0 && size.cy === 0) return

  const ind = '  '.repeat(indent)
  lines.push(`${ind}<${name}>`)
  lines.push(`${ind}  <CX>${size.cx}</CX>`)
  lines.push(`${ind}  <CY>${size.cy}</CY>`)
  lines.push(`${ind}</${name}>`)
}

function serializeRGB(lines: string[], indent: number, name: string, color: RGB): void {
  const ind = '  '.repeat(indent)
  lines.push(`${ind}<${name}>`)
  lines.push(`${ind}  <A>${color.alpha}</A>`)
  lines.push(`${ind}  <R>${color.r}</R>`)
  lines.push(`${ind}  <G>${color.g}</G>`)
  lines.push(`${ind}  <B>${color.b}</B>`)
  lines.push(`${ind}</${name}>`)
}

function serializeStyleFlags(
  lines: string[],
  indent: number,
  style: ScreenPiece['style']
): void {
  if (style.transparent) serializeProperty(lines, indent, 'Style_Transparent', 'true')
  if (style.border) serializeProperty(lines, indent, 'Style_Border', 'true')
  if (style.titlebar) serializeProperty(lines, indent, 'Style_Titlebar', 'true')
  if (style.closebox) serializeProperty(lines, indent, 'Style_Closebox', 'true')
  if (style.minimizebox) serializeProperty(lines, indent, 'Style_Minimizebox', 'true')
  if (style.tilebox) serializeProperty(lines, indent, 'Style_Tilebox', 'true')
  if (style.sizable) serializeProperty(lines, indent, 'Style_Sizable', 'true')
  if (style.escapeClose) serializeProperty(lines, indent, 'Style_EscapeClose', 'true')
  if (style.vScroll) serializeProperty(lines, indent, 'Style_VScroll', 'true')
  if (style.hScroll) serializeProperty(lines, indent, 'Style_HScroll', 'true')
}
