/**
 * Draw template types for visual styling
 */

import type { Point, Size } from '../base/Primitives'

/** TextureInfo - Reference to an external image file */
export interface TextureInfo {
  item: string // Reference name
  filename: string // Actual file path
  size: Size
}

/** Frame - A region within a texture (for animations or atlases) */
export interface Frame {
  texture: string // TextureInfo reference
  location: Point // Position within texture
  size: Size // Frame dimensions
  hotspot?: Point // Reference point for centering
  duration?: number // Milliseconds, for animations
}

/** Ui2DAnimation - Collection of frames for animations or multi-state graphics */
export interface Ui2DAnimation {
  item: string
  cycle: boolean // Loop animation
  grid?: boolean // Use grid layout
  rows?: number
  cols?: number
  cellWidth?: number
  cellHeight?: number
  frames: Frame[]
}

/** FrameTemplate - 9-patch border system with 12 regions */
export interface FrameTemplate {
  item: string

  // Border regions (Ui2DAnimation references)
  topLeft?: string
  top?: string
  topRight?: string
  leftTop?: string
  left?: string
  leftBottom?: string
  bottomLeft?: string
  bottom?: string
  bottomRight?: string
  rightTop?: string
  right?: string
  rightBottom?: string
  middle?: string

  // Overlap settings for seamless borders
  topLeftOverlapX?: number
  topLeftOverlapY?: number
  topRightOverlapX?: number
  topRightOverlapY?: number
  bottomLeftOverlapX?: number
  bottomLeftOverlapY?: number
  bottomRightOverlapX?: number
  bottomRightOverlapY?: number
}

/** ButtonDrawTemplate - Visual states for buttons */
export interface ButtonDrawTemplate {
  item: string

  // Button state graphics (Ui2DAnimation references)
  normal?: string
  pressed?: string
  flyby?: string // Hover state
  disabled?: string
  pressedFlyby?: string

  // Decal overlays
  normalDecal?: string
  pressedDecal?: string
  flybyDecal?: string
  disabledDecal?: string
  pressedFlybyDecal?: string
}

/** GaugeDrawTemplate - Visual elements for progress bars */
export interface GaugeDrawTemplate {
  item: string

  // Gauge components (Ui2DAnimation references)
  background?: string
  fill?: string
  lines?: string
  linesFill?: string
  endCapLeft?: string
  endCapRight?: string
}

/** SliderDrawTemplate - Visual elements for sliders */
export interface SliderDrawTemplate {
  item: string

  // Slider components
  background?: string
  thumb?: string
  thumbHover?: string
  endCapLeft?: string
  endCapRight?: string
  trackFill?: string
}

/** ScrollbarDrawTemplate - Visual elements for scrollbars */
export interface ScrollbarDrawTemplate {
  item: string

  // Scrollbar components
  background?: string
  thumb?: string
  upButton?: ButtonDrawTemplate | string
  downButton?: ButtonDrawTemplate | string
  leftButton?: ButtonDrawTemplate | string
  rightButton?: ButtonDrawTemplate | string
}

/** WindowDrawTemplate - Complete window styling */
export interface WindowDrawTemplate {
  item: string

  // Background
  background?: string // Ui2DAnimation reference

  // Titlebar
  titlebar?: string
  titlebarHeight?: number

  // Window buttons
  closeButton?: string // ButtonDrawTemplate reference
  minimizeButton?: string
  tileButton?: string

  // Border/frame
  border?: string // FrameTemplate reference

  // Scrollbars
  verticalScrollbar?: string // ScrollbarDrawTemplate reference
  horizontalScrollbar?: string
}

/** Collection of all templates in a project */
export interface TemplateLibrary {
  textures: Map<string, TextureInfo>
  animations: Map<string, Ui2DAnimation>
  frameTemplates: Map<string, FrameTemplate>
  buttonTemplates: Map<string, ButtonDrawTemplate>
  gaugeTemplates: Map<string, GaugeDrawTemplate>
  sliderTemplates: Map<string, SliderDrawTemplate>
  scrollbarTemplates: Map<string, ScrollbarDrawTemplate>
  windowTemplates: Map<string, WindowDrawTemplate>
}

/** Create an empty template library */
export function createTemplateLibrary(): TemplateLibrary {
  return {
    textures: new Map(),
    animations: new Map(),
    frameTemplates: new Map(),
    buttonTemplates: new Map(),
    gaugeTemplates: new Map(),
    sliderTemplates: new Map(),
    scrollbarTemplates: new Map(),
    windowTemplates: new Map(),
  }
}

/** EQType mappings for labels (dynamic text bindings) */
export const EQTYPE_LABELS: Record<number, string> = {
  1: 'Character Name',
  2: 'Level',
  3: 'Class',
  4: 'Deity',
  5: 'Race',
  17: 'Current HP',
  18: 'Max HP',
  19: 'HP Percent',
  28: 'Target Name',
  29: 'Target Level',
  30: 'Target Class',
  // ... more can be added
}

/** EQType mappings for gauges (progress bar bindings) */
export const EQTYPE_GAUGES: Record<number, string> = {
  1: 'HP',
  2: 'Mana',
  3: 'Stamina/Endurance',
  6: 'Target HP',
  9: 'Experience',
  10: 'Alternate Experience',
  // ... more can be added
}

/** Sample values for EQType preview in editor */
export const EQTYPE_SAMPLE_VALUES: Record<number, { current: number; max: number; text?: string }> = {
  1: { current: 1500, max: 2000 }, // HP
  2: { current: 800, max: 1000 }, // Mana
  3: { current: 90, max: 100 }, // Stamina
  6: { current: 75, max: 100 }, // Target HP %
  9: { current: 45, max: 100 }, // Experience %
}
