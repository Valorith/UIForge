/**
 * Specific control types that extend ScreenPiece
 */

import type { Point, Size, RGB } from '../base/Primitives'
import type { ScreenPiece } from './ScreenPiece'
import { createDefaultScreenPiece, generateId } from './ScreenPiece'

/** Screen - Top-level window container */
export interface Screen extends ScreenPiece {
  type: 'Screen'
  windowDrawTemplate?: string
  isMinimized?: boolean
  isLocked?: boolean
}

/** Button control */
export interface Button extends ScreenPiece {
  type: 'Button'
  normalTexture?: string
  pressedTexture?: string
  flybyTexture?: string
  disabledTexture?: string
  decalSize?: Size
  decalOffset?: Point
  soundPressed?: string
  soundUp?: string
  soundFlyby?: string
  isCheckbox?: boolean
  checked?: boolean
  radioGroup?: number
}

/** Gauge (progress bar) control */
export interface Gauge extends ScreenPiece {
  type: 'Gauge'
  eqType?: number // EQ data binding (1=HP, 2=Mana, etc.)
  gaugeDrawTemplate?: string
  fillTint?: RGB
  linesFillTint?: RGB
  orientation?: 'horizontal' | 'vertical'
}

/** Label (static text) */
export interface Label extends ScreenPiece {
  type: 'Label'
  eqType?: number // EQ data binding for dynamic text
  noWrap?: boolean
  alignCenter?: boolean
  alignRight?: boolean
}

/** Editbox (text input) */
export interface Editbox extends ScreenPiece {
  type: 'Editbox'
  maxChars?: number
  password?: boolean
  multiline?: boolean
  autoVScroll?: boolean
}

/** Listbox (table/list) */
export interface Listbox extends ScreenPiece {
  type: 'Listbox'
  columns: ListboxColumn[]
  headerStyle?: boolean
  sort?: boolean
  highlightColor?: RGB
}

export interface ListboxColumn {
  label?: string
  width: number
  type?: 'text' | 'icon' | 'progress'
}

/** Slider control */
export interface Slider extends ScreenPiece {
  type: 'Slider'
  sliderDrawTemplate?: string
  orientation?: 'horizontal' | 'vertical'
  minValue?: number
  maxValue?: number
  currentValue?: number
  pageSize?: number
}

/** TabBox container */
export interface TabBox extends ScreenPiece {
  type: 'TabBox'
  tabHeight?: number
  tabs: TabPage[]
}

export interface TabPage {
  label: string
  content?: ScreenPiece[]
}

/** STMLbox (rich text) */
export interface STMLbox extends ScreenPiece {
  type: 'STMLbox'
  maxLines?: number
}

/** Combobox */
export interface Combobox extends ScreenPiece {
  type: 'Combobox'
  choices: string[]
  selectedIndex?: number
}

/** InvSlot (inventory slot) */
export interface InvSlot extends ScreenPiece {
  type: 'InvSlot'
  invSlot?: number // Slot index
  bagSlot?: number // Bag index if in a bag
}

/** SpellGem (spell slot) */
export interface SpellGem extends ScreenPiece {
  type: 'SpellGem'
  spellSlot?: number
  spellGemDrawTemplate?: string
}

/** HotButton (hotbar button) */
export interface HotButton extends ScreenPiece {
  type: 'HotButton'
  buttonIndex?: number
}

/** StaticAnimation (static image/sprite) */
export interface StaticAnimation extends ScreenPiece {
  type: 'StaticAnimation'
  animation?: string // Reference to Ui2DAnimation
}

/** TileLayoutBox (grid layout container) */
export interface TileLayoutBox extends ScreenPiece {
  type: 'TileLayoutBox'
  spacing?: number
  secondarySpacing?: number
  horizontalFirst?: boolean
  anchorToTop?: boolean
  anchorToLeft?: boolean
  firstPieceTemplate?: boolean
  snapToChildren?: boolean
}

/** LayoutBox (generic layout container) */
export interface LayoutBox extends ScreenPiece {
  type: 'LayoutBox' | 'VerticalLayoutBox' | 'HorizontalLayoutBox'
  spacing?: number
  autoStretchHorizontal?: boolean
  autoStretchVertical?: boolean
}

/** Page (tab page content) */
export interface Page extends ScreenPiece {
  type: 'Page'
  tabText?: string
}

/** Browser (embedded browser/web view) */
export interface Browser extends ScreenPiece {
  type: 'Browser'
}

/** TreeView (hierarchical tree) */
export interface TreeView extends ScreenPiece {
  type: 'TreeView'
}

/** StaticText (non-interactive text) */
export interface StaticText extends ScreenPiece {
  type: 'StaticText'
}

/** Grid (grid layout container) */
export interface Grid extends ScreenPiece {
  type: 'Grid'
  rows?: number
  cols?: number
  cellWidth?: number
  cellHeight?: number
}

/** RadioGroup (radio button group) */
export interface RadioGroup extends ScreenPiece {
  type: 'RadioGroup'
}

/** Holder (placeholder/container element) */
export interface Holder extends ScreenPiece {
  type: 'Holder'
}

/** Header (column/section header) */
export interface Header extends ScreenPiece {
  type: 'Header'
}

/** Layout (layout child element) */
export interface Layout extends ScreenPiece {
  type: 'Layout'
}

/** StaticFrame (non-interactive frame) */
export interface StaticFrame extends ScreenPiece {
  type: 'StaticFrame'
  frameTemplate?: string
}

/** StaticGroup (grouping container) */
export interface StaticGroup extends ScreenPiece {
  type: 'StaticGroup'
}

/** StaticScreen (static screen element) */
export interface StaticScreen extends ScreenPiece {
  type: 'StaticScreen'
}

/** Union type for all control types */
export type UIControl =
  | Screen
  | Button
  | Gauge
  | Label
  | Editbox
  | Listbox
  | Slider
  | TabBox
  | STMLbox
  | Combobox
  | InvSlot
  | SpellGem
  | HotButton
  | StaticAnimation
  | TileLayoutBox
  | LayoutBox
  | Page
  | Browser
  | TreeView
  | StaticText
  | StaticFrame
  | StaticGroup
  | StaticScreen
  | Grid
  | RadioGroup
  | Holder
  | Header
  | Layout
  | ScreenPiece // Generic fallback

/** Type guards */
export function isScreen(piece: ScreenPiece): piece is Screen {
  return piece.type === 'Screen'
}

export function isButton(piece: ScreenPiece): piece is Button {
  return piece.type === 'Button'
}

export function isGauge(piece: ScreenPiece): piece is Gauge {
  return piece.type === 'Gauge'
}

export function isLabel(piece: ScreenPiece): piece is Label {
  return piece.type === 'Label'
}

export function isEditbox(piece: ScreenPiece): piece is Editbox {
  return piece.type === 'Editbox'
}

export function isListbox(piece: ScreenPiece): piece is Listbox {
  return piece.type === 'Listbox'
}

/** Factory functions */
export function createScreen(screenId: string): Screen {
  return {
    ...createDefaultScreenPiece('Screen', screenId),
    type: 'Screen',
    size: { cx: 400, cy: 300 },
  }
}

export function createButton(screenId: string): Button {
  return {
    ...createDefaultScreenPiece('Button', screenId),
    type: 'Button',
    size: { cx: 80, cy: 24 },
    text: 'Button',
  }
}

export function createGauge(screenId: string): Gauge {
  return {
    ...createDefaultScreenPiece('Gauge', screenId),
    type: 'Gauge',
    size: { cx: 150, cy: 20 },
    orientation: 'horizontal',
  }
}

export function createLabel(screenId: string): Label {
  return {
    ...createDefaultScreenPiece('Label', screenId),
    type: 'Label',
    size: { cx: 100, cy: 16 },
    text: 'Label',
  }
}
