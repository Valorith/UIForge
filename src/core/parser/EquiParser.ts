/**
 * EQUI_*.xml Parser
 *
 * Parses EverQuest UI definition files into typed model objects.
 */

import type { SidlSchema } from './SidlParser'
import type { Point, Size, RGB } from '@/models/base/Primitives'
import type { ScreenPiece, StyleFlags } from '@/models/elements/ScreenPiece'
import type { Screen } from '@/models/elements/Controls'
import type {
  TextureInfo,
  Frame,
  Ui2DAnimation,
  FrameTemplate,
  ButtonDrawTemplate,
  GaugeDrawTemplate,
  WindowDrawTemplate,
} from '@/models/elements/Templates'
import { generateId } from '@/models/elements/ScreenPiece'
import { createTemplateLibrary, type TemplateLibrary } from '@/models/elements/Templates'

/** Result of parsing an EQUI file */
export interface ParsedEquiFile {
  filename: string
  screens: Screen[]
  templates: TemplateLibrary
  errors: ParseError[]
  /** For manifest files: list of included file names */
  includes?: string[]
  /** All items by name (for Pieces resolution) */
  itemRegistry: Map<string, ScreenPiece>
  /** Unresolved Pieces references */
  unresolvedPieces: Map<string, string[]>
}

/** Parse error information */
export interface ParseError {
  message: string
  line?: number
  element?: string
}

/**
 * Parse an EQUI_*.xml file
 */
export function parseEquiFile(
  xmlContent: string,
  filename: string,
  _schema?: SidlSchema
): ParsedEquiFile {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  const result: ParsedEquiFile = {
    filename,
    screens: [],
    templates: createTemplateLibrary(),
    errors: [],
    itemRegistry: new Map(),
    unresolvedPieces: new Map(),
  }

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    result.errors.push({
      message: `XML parse error: ${parseError.textContent}`,
    })
    return result
  }

  // Parse the root element (usually <XML> or similar)
  const root = doc.documentElement

  // Check if this is a manifest file with Composite/Include pattern
  const composite = root.querySelector('Composite')
  if (composite) {
    const includes: string[] = []
    for (const includeNode of composite.querySelectorAll('Include')) {
      const includePath = includeNode.textContent?.trim()
      if (includePath) {
        includes.push(includePath)
      }
    }
    if (includes.length > 0) {
      result.includes = includes
      return result
    }
  }

  // Parse all top-level elements
  for (const child of root.children) {
    try {
      parseTopLevelElement(child, result)
    } catch (err) {
      result.errors.push({
        message: `Error parsing ${child.tagName}: ${err}`,
        element: child.tagName,
      })
    }
  }

  return result
}

// Template/definition tag names (not visual elements)
const templateTags = new Set([
  'TextureInfo',
  'Ui2DAnimation',
  'FrameTemplate',
  'ButtonDrawTemplate',
  'GaugeDrawTemplate',
  'WindowDrawTemplate',
  'SliderDrawTemplate',
  'SpellGemDrawTemplate',
  'ScrollbarDrawTemplate',
])

// Known visual element types that can appear at top level
const visualElementTags = new Set([
  'Screen',
  'Button',
  'Gauge',
  'Label',
  'Editbox',
  'Listbox',
  'Combobox',
  'Slider',
  'Page',
  'TabBox',
  'InvSlot',
  'SpellGem',
  'HotButton',
  'StaticAnimation',
  'StaticText',
  'StaticFrame',
  'StaticGroup',
  'StaticScreen',
  'LayoutBox',
  'VerticalLayoutBox',
  'HorizontalLayoutBox',
  'TemplateAssoc',
  'STMLbox',
  'Browser',
  'TreeView',
  'TileLayoutBox',
  'Grid',
  'RadioGroup',
  'Holder',
  'Header',
  'Layout',
  'Choices',
])

/**
 * Parse a top-level element (Screen, Template, etc.)
 */
function parseTopLevelElement(node: Element, result: ParsedEquiFile): void {
  const tagName = node.tagName

  // Handle templates first
  if (templateTags.has(tagName)) {
    switch (tagName) {
      case 'TextureInfo': {
        const textureInfo = parseTextureInfo(node)
        if (textureInfo) {
          result.templates.textures.set(textureInfo.item, textureInfo)
        }
        break
      }

      case 'Ui2DAnimation': {
        const animation = parseUi2DAnimation(node)
        if (animation) {
          result.templates.animations.set(animation.item, animation)
        }
        break
      }

      case 'FrameTemplate': {
        const frameTemplate = parseFrameTemplate(node)
        if (frameTemplate) {
          result.templates.frameTemplates.set(frameTemplate.item, frameTemplate)
        }
        break
      }

      case 'ButtonDrawTemplate': {
        const buttonTemplate = parseButtonDrawTemplate(node)
        if (buttonTemplate) {
          result.templates.buttonTemplates.set(buttonTemplate.item, buttonTemplate)
        }
        break
      }

      case 'GaugeDrawTemplate': {
        const gaugeTemplate = parseGaugeDrawTemplate(node)
        if (gaugeTemplate) {
          result.templates.gaugeTemplates.set(gaugeTemplate.item, gaugeTemplate)
        }
        break
      }

      case 'WindowDrawTemplate': {
        const windowTemplate = parseWindowDrawTemplate(node)
        if (windowTemplate) {
          result.templates.windowTemplates.set(windowTemplate.item, windowTemplate)
        }
        break
      }
    }
    return
  }

  // Handle Screen elements specially (they're the main container type)
  if (tagName === 'Screen') {
    const screen = parseScreen(node, result)
    if (screen) {
      result.screens.push(screen)
    }
    return
  }

  // Handle other visual elements as top-level screens
  // Many EQUI files define buttons, gauges, etc. at the top level
  if (visualElementTags.has(tagName) || node.querySelector('ScreenID')) {
    const piece = parseScreenPiece(node, result)
    if (piece) {
      // Wrap as a screen-like element so it appears in the tree
      const wrapper: Screen = {
        id: piece.id,
        type: piece.type,
        screenId: piece.screenId,
        item: piece.item,
        location: piece.location,
        size: piece.size,
        relativePosition: piece.relativePosition,
        autoStretch: piece.autoStretch,
        topAnchorToTop: piece.topAnchorToTop,
        bottomAnchorToTop: piece.bottomAnchorToTop,
        leftAnchorToLeft: piece.leftAnchorToLeft,
        rightAnchorToLeft: piece.rightAnchorToLeft,
        topAnchorOffset: piece.topAnchorOffset,
        bottomAnchorOffset: piece.bottomAnchorOffset,
        leftAnchorOffset: piece.leftAnchorOffset,
        rightAnchorOffset: piece.rightAnchorOffset,
        textColor: piece.textColor,
        font: piece.font,
        text: piece.text,
        tooltip: piece.tooltip,
        style: piece.style,
        drawTemplate: piece.drawTemplate,
        children: piece.children,
      }
      result.screens.push(wrapper)
    }
  }
}

/**
 * Parse a Screen element
 */
function parseScreen(node: Element, result: ParsedEquiFile): Screen | null {
  const screenId = getChildText(node, 'ScreenID')
  if (!screenId) return null

  const screen: Screen = {
    id: generateId(),
    type: 'Screen',
    screenId,
    item: node.getAttribute('item') || undefined,
    location: parsePoint(node, 'Location'),
    size: parseSize(node, 'Size'),
    relativePosition: parseBoolean(node, 'RelativePosition'),
    autoStretch: parseBoolean(node, 'AutoStretch'),
    topAnchorToTop: parseBoolean(node, 'TopAnchorToTop', true),
    bottomAnchorToTop: parseBoolean(node, 'BottomAnchorToTop'),
    leftAnchorToLeft: parseBoolean(node, 'LeftAnchorToLeft', true),
    rightAnchorToLeft: parseBoolean(node, 'RightAnchorToLeft'),
    topAnchorOffset: parseInt(getChildText(node, 'TopOffset') || '0', 10),
    bottomAnchorOffset: parseInt(getChildText(node, 'BottomOffset') || '0', 10),
    leftAnchorOffset: parseInt(getChildText(node, 'LeftOffset') || '0', 10),
    rightAnchorOffset: parseInt(getChildText(node, 'RightOffset') || '0', 10),
    textColor: parseRGB(node, 'TextColor'),
    font: parseInt(getChildText(node, 'Font') || '0', 10),
    text: getChildText(node, 'Text'),
    tooltip: getChildText(node, 'TooltipReference'),
    style: parseStyleFlags(node),
    drawTemplate: getChildText(node, 'DrawTemplate'),
    windowDrawTemplate: getChildText(node, 'WindowDrawTemplate'),
    children: [],
  }

  // Register the screen by its item name for Pieces resolution
  if (screen.item) {
    result.itemRegistry.set(screen.item, screen)
  }

  // Collect Pieces references (to be resolved later across all files)
  const piecesRefs: string[] = []
  for (const piecesNode of node.querySelectorAll(':scope > Pieces')) {
    const refName = piecesNode.textContent?.trim()
    if (refName) {
      piecesRefs.push(refName)
    }
  }
  if (piecesRefs.length > 0) {
    result.unresolvedPieces.set(screen.id, piecesRefs)
  }

  // Parse nested child elements (direct children that are ScreenPieces)
  for (const child of node.children) {
    const childPiece = parseScreenPiece(child, result)
    if (childPiece) {
      childPiece.parentId = screen.id
      screen.children.push(childPiece)
    }
  }

  return screen
}

/**
 * Parse any ScreenPiece element
 */
function parseScreenPiece(node: Element, result: ParsedEquiFile): ScreenPiece | null {
  const tagName = node.tagName
  const screenId = getChildText(node, 'ScreenID')

  // Skip non-ScreenPiece elements (property elements)
  const knownNonPieces = new Set([
    'ScreenID', 'Location', 'Size', 'RelativePosition', 'AutoStretch',
    'TopAnchorToTop', 'BottomAnchorToTop', 'LeftAnchorToLeft', 'RightAnchorToLeft',
    'TopOffset', 'BottomOffset', 'LeftOffset', 'RightOffset',
    'TextColor', 'Font', 'Text', 'TooltipReference', 'DrawTemplate',
    'WindowDrawTemplate', 'Style_Titlebar', 'Style_Closebox', 'Style_Minimizebox',
    'Style_Border', 'Style_Sizable', 'Style_Transparent', 'Style_VScroll', 'Style_HScroll',
    'Style_EscapeClose', 'Style_Checkbox', 'Style_Tilebox',
    'Pieces', 'EQType', 'GaugeDrawTemplate', 'ButtonDrawTemplate', 'TextureInfo',
    'Ui2DAnimation', 'FrameTemplate', 'Composite', 'Include',
    // Layout properties
    'Spacing', 'SecondarySpacing', 'HorizontalFirst', 'AnchorToTop', 'AnchorToLeft',
    'FirstPieceTemplate', 'SnapToChildren', 'AutoStretchHorizontal', 'AutoStretchVertical',
    // Control properties
    'Animation', 'InvSlot', 'BagSlot', 'SpellSlot', 'ButtonIndex', 'TabText',
    'MaxChars', 'Password', 'Multiline', 'AutoVScroll', 'NoWrap', 'AlignCenter', 'AlignRight',
    // Grid properties
    'Rows', 'Cols', 'CellWidth', 'CellHeight',
    // Listbox properties
    'HeaderStyle', 'Sort', 'HighlightColor', 'Columns',
    // TabBox properties
    'TabHeight', 'TabStyle',
    // STMLbox properties
    'MaxLines',
    // Combobox properties
    'Choices', 'SelectedIndex',
    // Slider properties
    'MinValue', 'MaxValue', 'CurrentValue', 'PageSize', 'SliderDrawTemplate', 'Orientation',
    // SpellGem properties
    'SpellGemDrawTemplate',
    // Template references
    'Template', 'Frame', 'Duration', 'Hotspot', 'Texture', 'Cycle',
    // Misc properties
    'Item', 'Border', 'Background', 'Fill', 'FillTint', 'LinesFillTint',
    'TooltipText', 'ClickThrough', 'Enabled', 'Visible', 'Alpha',
  ])

  if (knownNonPieces.has(tagName)) {
    return null
  }

  // Create the base ScreenPiece
  const piece: ScreenPiece = {
    id: generateId(),
    type: tagName,
    screenId: screenId || tagName,
    item: node.getAttribute('item') || undefined,
    location: parsePoint(node, 'Location'),
    size: parseSize(node, 'Size'),
    relativePosition: parseBoolean(node, 'RelativePosition'),
    autoStretch: parseBoolean(node, 'AutoStretch'),
    topAnchorToTop: parseBoolean(node, 'TopAnchorToTop', true),
    bottomAnchorToTop: parseBoolean(node, 'BottomAnchorToTop'),
    leftAnchorToLeft: parseBoolean(node, 'LeftAnchorToLeft', true),
    rightAnchorToLeft: parseBoolean(node, 'RightAnchorToLeft'),
    topAnchorOffset: parseInt(getChildText(node, 'TopOffset') || '0', 10),
    bottomAnchorOffset: parseInt(getChildText(node, 'BottomOffset') || '0', 10),
    leftAnchorOffset: parseInt(getChildText(node, 'LeftOffset') || '0', 10),
    rightAnchorOffset: parseInt(getChildText(node, 'RightOffset') || '0', 10),
    textColor: parseRGB(node, 'TextColor'),
    font: parseInt(getChildText(node, 'Font') || '0', 10),
    text: getChildText(node, 'Text'),
    tooltip: getChildText(node, 'TooltipReference'),
    style: parseStyleFlags(node),
    drawTemplate: getChildText(node, 'DrawTemplate'),
    children: [],
  }

  // Register the piece by its item name for Pieces resolution
  if (piece.item) {
    result.itemRegistry.set(piece.item, piece)
  }

  // Parse control-specific properties
  parseControlSpecificProps(node, piece)

  // Collect Pieces references (to be resolved later)
  const piecesRefs: string[] = []
  for (const piecesNode of node.querySelectorAll(':scope > Pieces')) {
    const refName = piecesNode.textContent?.trim()
    if (refName) {
      piecesRefs.push(refName)
    }
  }
  if (piecesRefs.length > 0) {
    result.unresolvedPieces.set(piece.id, piecesRefs)
  }

  // Parse nested children
  for (const child of node.children) {
    const childPiece = parseScreenPiece(child, result)
    if (childPiece) {
      childPiece.parentId = piece.id
      piece.children.push(childPiece)
    }
  }

  return piece
}

/**
 * Parse control-specific properties based on type
 */
function parseControlSpecificProps(node: Element, piece: ScreenPiece): void {
  const anyPiece = piece as Record<string, unknown>
  const tagName = node.tagName

  // Common EQType for data-bound elements
  // EQType can be a number (e.g., "1") or a path (e.g., "inventory/Bank 0")
  const eqType = getChildText(node, 'EQType')
  if (eqType) {
    // Try to parse as number first, otherwise store as string
    const numValue = parseInt(eqType, 10)
    if (!isNaN(numValue) && String(numValue) === eqType.trim()) {
      anyPiece.eqType = numValue
    } else {
      anyPiece.eqType = eqType // Store path-based EQType as string
    }
  }

  // Parse type-specific properties
  switch (tagName) {
    case 'Gauge':
      anyPiece.gaugeDrawTemplate = getChildText(node, 'GaugeDrawTemplate')
      anyPiece.fillTint = parseRGB(node, 'FillTint')
      anyPiece.linesFillTint = parseRGB(node, 'LinesFillTint')
      anyPiece.orientation = getChildText(node, 'Orientation') || 'horizontal'
      break

    case 'Button':
      anyPiece.buttonDrawTemplate = getChildText(node, 'ButtonDrawTemplate')
      anyPiece.normalTexture = getChildText(node, 'NormalTexture')
      anyPiece.pressedTexture = getChildText(node, 'PressedTexture')
      anyPiece.flybyTexture = getChildText(node, 'FlybyTexture')
      anyPiece.disabledTexture = getChildText(node, 'DisabledTexture')
      anyPiece.isCheckbox = parseBoolean(node, 'Checkbox')
      anyPiece.checked = parseBoolean(node, 'Checked')
      anyPiece.radioGroup = parseInt(getChildText(node, 'RadioGroup') || '0', 10)
      break

    case 'Label':
      anyPiece.noWrap = parseBoolean(node, 'NoWrap')
      anyPiece.alignCenter = parseBoolean(node, 'AlignCenter')
      anyPiece.alignRight = parseBoolean(node, 'AlignRight')
      break

    case 'Editbox':
      anyPiece.maxChars = parseInt(getChildText(node, 'MaxChars') || '0', 10)
      anyPiece.password = parseBoolean(node, 'Password')
      anyPiece.multiline = parseBoolean(node, 'Multiline')
      anyPiece.autoVScroll = parseBoolean(node, 'AutoVScroll')
      break

    case 'InvSlot':
      anyPiece.invSlot = parseInt(getChildText(node, 'InvSlot') || '0', 10)
      anyPiece.bagSlot = parseInt(getChildText(node, 'BagSlot') || '0', 10)
      break

    case 'SpellGem':
      anyPiece.spellSlot = parseInt(getChildText(node, 'SpellSlot') || '0', 10)
      anyPiece.spellGemDrawTemplate = getChildText(node, 'SpellGemDrawTemplate')
      break

    case 'HotButton':
      anyPiece.buttonIndex = parseInt(getChildText(node, 'ButtonIndex') || '0', 10)
      break

    case 'StaticAnimation':
      anyPiece.animation = getChildText(node, 'Animation')
      break

    case 'TileLayoutBox':
      anyPiece.spacing = parseInt(getChildText(node, 'Spacing') || '0', 10)
      anyPiece.secondarySpacing = parseInt(getChildText(node, 'SecondarySpacing') || '0', 10)
      anyPiece.horizontalFirst = parseBoolean(node, 'HorizontalFirst')
      anyPiece.anchorToTop = parseBoolean(node, 'AnchorToTop')
      anyPiece.anchorToLeft = parseBoolean(node, 'AnchorToLeft')
      anyPiece.firstPieceTemplate = parseBoolean(node, 'FirstPieceTemplate')
      anyPiece.snapToChildren = parseBoolean(node, 'SnapToChildren')
      break

    case 'LayoutBox':
    case 'VerticalLayoutBox':
    case 'HorizontalLayoutBox':
      anyPiece.spacing = parseInt(getChildText(node, 'Spacing') || '0', 10)
      anyPiece.autoStretchHorizontal = parseBoolean(node, 'AutoStretchHorizontal')
      anyPiece.autoStretchVertical = parseBoolean(node, 'AutoStretchVertical')
      break

    case 'Page':
      anyPiece.tabText = getChildText(node, 'TabText')
      break

    case 'Slider':
      anyPiece.sliderDrawTemplate = getChildText(node, 'SliderDrawTemplate')
      anyPiece.orientation = getChildText(node, 'Orientation') || 'horizontal'
      anyPiece.minValue = parseInt(getChildText(node, 'MinValue') || '0', 10)
      anyPiece.maxValue = parseInt(getChildText(node, 'MaxValue') || '100', 10)
      anyPiece.currentValue = parseInt(getChildText(node, 'CurrentValue') || '0', 10)
      anyPiece.pageSize = parseInt(getChildText(node, 'PageSize') || '10', 10)
      break

    case 'StaticFrame':
      anyPiece.frameTemplate = getChildText(node, 'FrameTemplate')
      break

    case 'Grid':
      anyPiece.rows = parseInt(getChildText(node, 'Rows') || '1', 10)
      anyPiece.cols = parseInt(getChildText(node, 'Cols') || '1', 10)
      anyPiece.cellWidth = parseInt(getChildText(node, 'CellWidth') || '0', 10)
      anyPiece.cellHeight = parseInt(getChildText(node, 'CellHeight') || '0', 10)
      break

    case 'Listbox':
      anyPiece.headerStyle = parseBoolean(node, 'HeaderStyle')
      anyPiece.sort = parseBoolean(node, 'Sort')
      anyPiece.highlightColor = parseRGB(node, 'HighlightColor')
      break

    case 'TabBox':
      anyPiece.tabHeight = parseInt(getChildText(node, 'TabHeight') || '20', 10)
      break

    case 'STMLbox':
      anyPiece.maxLines = parseInt(getChildText(node, 'MaxLines') || '0', 10)
      break

    case 'Combobox':
      // Parse choices if present
      const choices: string[] = []
      for (const choiceNode of node.querySelectorAll(':scope > Choices')) {
        const choice = choiceNode.textContent?.trim()
        if (choice) choices.push(choice)
      }
      if (choices.length > 0) {
        anyPiece.choices = choices
      }
      break
  }
}

/**
 * Parse style flags from a node
 */
function parseStyleFlags(node: Element): StyleFlags {
  return {
    transparent: parseBoolean(node, 'Style_Transparent'),
    border: parseBoolean(node, 'Style_Border'),
    titlebar: parseBoolean(node, 'Style_Titlebar'),
    closebox: parseBoolean(node, 'Style_Closebox'),
    minimizebox: parseBoolean(node, 'Style_Minimizebox'),
    tilebox: parseBoolean(node, 'Style_Tilebox'),
    sizable: parseBoolean(node, 'Style_Sizable'),
    escapeClose: parseBoolean(node, 'Style_EscapeClose'),
    vScroll: parseBoolean(node, 'Style_VScroll'),
    hScroll: parseBoolean(node, 'Style_HScroll'),
  }
}

/**
 * Parse TextureInfo
 */
function parseTextureInfo(node: Element): TextureInfo | null {
  const item = node.getAttribute('item')
  if (!item) return null

  return {
    item,
    filename: getChildText(node, 'Filename') || item,
    size: parseSize(node, 'Size'),
  }
}

/**
 * Parse Ui2DAnimation
 */
function parseUi2DAnimation(node: Element): Ui2DAnimation | null {
  const item = node.getAttribute('item')
  if (!item) return null

  const frames: Frame[] = []
  for (const frameNode of node.querySelectorAll('Frame')) {
    const frame = parseFrame(frameNode)
    if (frame) {
      frames.push(frame)
    }
  }

  return {
    item,
    cycle: parseBoolean(node, 'Cycle'),
    grid: parseBoolean(node, 'Grid'),
    rows: parseInt(getChildText(node, 'Rows') || '1', 10),
    cols: parseInt(getChildText(node, 'Cols') || '1', 10),
    cellWidth: parseInt(getChildText(node, 'CellWidth') || '0', 10),
    cellHeight: parseInt(getChildText(node, 'CellHeight') || '0', 10),
    frames,
  }
}

/**
 * Parse a Frame element
 */
function parseFrame(node: Element): Frame | null {
  return {
    texture: getChildText(node, 'Texture') || '',
    location: parsePoint(node, 'Location'),
    size: parseSize(node, 'Size'),
    hotspot: parsePoint(node, 'Hotspot'),
    duration: parseInt(getChildText(node, 'Duration') || '0', 10),
  }
}

/**
 * Parse FrameTemplate
 */
function parseFrameTemplate(node: Element): FrameTemplate | null {
  const item = node.getAttribute('item')
  if (!item) return null

  return {
    item,
    topLeft: getChildText(node, 'TopLeft'),
    top: getChildText(node, 'Top'),
    topRight: getChildText(node, 'TopRight'),
    leftTop: getChildText(node, 'LeftTop'),
    left: getChildText(node, 'Left'),
    leftBottom: getChildText(node, 'LeftBottom'),
    bottomLeft: getChildText(node, 'BottomLeft'),
    bottom: getChildText(node, 'Bottom'),
    bottomRight: getChildText(node, 'BottomRight'),
    rightTop: getChildText(node, 'RightTop'),
    right: getChildText(node, 'Right'),
    rightBottom: getChildText(node, 'RightBottom'),
    middle: getChildText(node, 'Middle'),
  }
}

/**
 * Parse ButtonDrawTemplate
 */
function parseButtonDrawTemplate(node: Element): ButtonDrawTemplate | null {
  const item = node.getAttribute('item')
  if (!item) return null

  return {
    item,
    normal: getChildText(node, 'Normal'),
    pressed: getChildText(node, 'Pressed'),
    flyby: getChildText(node, 'Flyby'),
    disabled: getChildText(node, 'Disabled'),
    pressedFlyby: getChildText(node, 'PressedFlyby'),
    normalDecal: getChildText(node, 'NormalDecal'),
    pressedDecal: getChildText(node, 'PressedDecal'),
    flybyDecal: getChildText(node, 'FlybyDecal'),
    disabledDecal: getChildText(node, 'DisabledDecal'),
  }
}

/**
 * Parse GaugeDrawTemplate
 */
function parseGaugeDrawTemplate(node: Element): GaugeDrawTemplate | null {
  const item = node.getAttribute('item')
  if (!item) return null

  return {
    item,
    background: getChildText(node, 'Background'),
    fill: getChildText(node, 'Fill'),
    lines: getChildText(node, 'Lines'),
    linesFill: getChildText(node, 'LinesFill'),
    endCapLeft: getChildText(node, 'EndCapLeft'),
    endCapRight: getChildText(node, 'EndCapRight'),
  }
}

/**
 * Parse WindowDrawTemplate
 */
function parseWindowDrawTemplate(node: Element): WindowDrawTemplate | null {
  const item = node.getAttribute('item')
  if (!item) return null

  return {
    item,
    background: getChildText(node, 'Background'),
    titlebar: getChildText(node, 'Titlebar'),
    titlebarHeight: parseInt(getChildText(node, 'TitlebarHeight') || '0', 10),
    closeButton: getChildText(node, 'CloseButton'),
    minimizeButton: getChildText(node, 'MinimizeButton'),
    tileButton: getChildText(node, 'TileButton'),
    border: getChildText(node, 'Border'),
    verticalScrollbar: getChildText(node, 'VerticalScrollbar'),
    horizontalScrollbar: getChildText(node, 'HorizontalScrollbar'),
  }
}

// ============ Helper Functions ============

/**
 * Get text content of a child element
 */
function getChildText(parent: Element, childName: string): string | undefined {
  const child = parent.querySelector(`:scope > ${childName}`)
  return child?.textContent?.trim() || undefined
}

/**
 * Parse a Point from child elements
 */
function parsePoint(parent: Element, containerName: string): Point {
  const container = parent.querySelector(`:scope > ${containerName}`)
  if (!container) {
    return { x: 0, y: 0 }
  }

  return {
    x: parseInt(getChildText(container, 'X') || '0', 10),
    y: parseInt(getChildText(container, 'Y') || '0', 10),
  }
}

/**
 * Parse a Size from child elements
 */
function parseSize(parent: Element, containerName: string): Size {
  const container = parent.querySelector(`:scope > ${containerName}`)
  if (!container) {
    return { cx: 0, cy: 0 }
  }

  return {
    cx: parseInt(getChildText(container, 'CX') || '0', 10),
    cy: parseInt(getChildText(container, 'CY') || '0', 10),
  }
}

/**
 * Parse RGB color from child elements
 */
function parseRGB(parent: Element, containerName: string): RGB | undefined {
  const container = parent.querySelector(`:scope > ${containerName}`)
  if (!container) {
    return undefined
  }

  return {
    alpha: parseInt(getChildText(container, 'A') || '255', 10),
    r: parseInt(getChildText(container, 'R') || '255', 10),
    g: parseInt(getChildText(container, 'G') || '255', 10),
    b: parseInt(getChildText(container, 'B') || '255', 10),
  }
}

/**
 * Parse a boolean value
 */
function parseBoolean(parent: Element, childName: string, defaultValue = false): boolean {
  const text = getChildText(parent, childName)
  if (text === undefined) return defaultValue
  return text.toLowerCase() === 'true' || text === '1'
}

/**
 * Resolve Pieces references across multiple parsed files.
 * This links parent elements to their children by item name.
 */
export function resolvePiecesReferences(parsedFiles: ParsedEquiFile[]): void {
  // Build a global item registry from all files
  const globalRegistry = new Map<string, ScreenPiece>()

  for (const file of parsedFiles) {
    for (const [itemName, piece] of file.itemRegistry) {
      globalRegistry.set(itemName, piece)
    }
  }

  // Build a map of all pieces by ID
  const allPiecesById = new Map<string, ScreenPiece>()

  function collectPieces(screens: ScreenPiece[]) {
    for (const screen of screens) {
      allPiecesById.set(screen.id, screen)
      if (screen.children.length > 0) {
        collectPieces(screen.children)
      }
    }
  }

  for (const file of parsedFiles) {
    collectPieces(file.screens)
  }

  // Resolve unresolved Pieces references
  for (const file of parsedFiles) {
    for (const [parentId, pieceNames] of file.unresolvedPieces) {
      const parent = allPiecesById.get(parentId)
      if (!parent) continue

      for (const pieceName of pieceNames) {
        const child = globalRegistry.get(pieceName)
        if (child) {
          // Clone the child so we don't share references
          const childCopy = JSON.parse(JSON.stringify(child))
          childCopy.parentId = parent.id
          // Generate a new ID to avoid conflicts
          childCopy.id = generateId()
          parent.children.push(childCopy)
        }
      }
    }
  }
}

/**
 * Check if a parsed file is a manifest (contains Include directives)
 */
export function isManifestFile(parsed: ParsedEquiFile): boolean {
  return !!parsed.includes && parsed.includes.length > 0
}
