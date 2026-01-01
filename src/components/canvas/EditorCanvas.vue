<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useElementsStore } from '@/stores/elementsStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useProjectStore } from '@/stores/projectStore'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'
import { rgbToCss } from '@/models/base/Primitives'
import AlignmentToolbar from './AlignmentToolbar.vue'
import SnapGuides from './SnapGuides.vue'

const elementsStore = useElementsStore()
const selectionStore = useSelectionStore()
const historyStore = useHistoryStore()
const projectStore = useProjectStore()

const containerRef = ref<HTMLDivElement>()
const stageConfig = ref({
  width: 800,
  height: 600,
})

// Grid and view settings
const showGrid = ref(true)
const showSnapGuides = ref(true)
const gridSize = 20
const zoom = ref(1)
const snapGuidesRef = ref<InstanceType<typeof SnapGuides>>()

// Drag state
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartElementPos = ref({ x: 0, y: 0 })

// Resize state
const isResizing = ref(false)
const resizeHandle = ref<string | null>(null)
const resizeStartSize = ref({ cx: 0, cy: 0 })
const resizeStartPos = ref({ x: 0, y: 0 })
const resizeStartLocation = ref({ x: 0, y: 0 })

// Emit for drag-drop
const emit = defineEmits<{
  fileDrop: [files: File[]]
}>()

function updateStageSize() {
  if (containerRef.value) {
    stageConfig.value.width = containerRef.value.clientWidth
    stageConfig.value.height = containerRef.value.clientHeight
  }
}

onMounted(() => {
  updateStageSize()
  window.addEventListener('resize', updateStageSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateStageSize)
})

// Get root elements to render
const rootElements = computed(() => elementsStore.rootElements)

// Generate grid lines
function getGridLines() {
  const lines = []
  const { width, height } = stageConfig.value
  const scaledGridSize = gridSize * zoom.value

  for (let x = 0; x <= width; x += scaledGridSize) {
    lines.push({ points: [x, 0, x, height], key: `v-${x}` })
  }

  for (let y = 0; y <= height; y += scaledGridSize) {
    lines.push({ points: [0, y, width, y], key: `h-${y}` })
  }

  return lines
}

// Element type configuration for visual styling
const elementTypeConfig: Record<string, {
  fill: string
  stroke: string
  icon: string
  badgeColor: string
  cornerRadius: number
}> = {
  // Container types
  Screen: { fill: '#1e1e2e', stroke: '#4a4a6a', icon: '⬜', badgeColor: '#6366f1', cornerRadius: 4 },
  TileLayoutBox: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⊞', badgeColor: '#6366f1', cornerRadius: 2 },
  LayoutBox: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '▢', badgeColor: '#6366f1', cornerRadius: 2 },
  VerticalLayoutBox: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⊡', badgeColor: '#6366f1', cornerRadius: 2 },
  HorizontalLayoutBox: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⊟', badgeColor: '#6366f1', cornerRadius: 2 },
  Page: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '📄', badgeColor: '#6366f1', cornerRadius: 2 },
  TabBox: { fill: '#1e1e2e', stroke: '#4a4a6a', icon: '📑', badgeColor: '#6366f1', cornerRadius: 4 },
  StaticGroup: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⬚', badgeColor: '#64748b', cornerRadius: 2 },
  StaticScreen: { fill: '#1e1e2e', stroke: '#4a4a6a', icon: '⬜', badgeColor: '#64748b', cornerRadius: 4 },

  // Control types
  Button: { fill: '#3a3a5e', stroke: '#5a5a8a', icon: '▣', badgeColor: '#8b5cf6', cornerRadius: 4 },
  Gauge: { fill: '#1a2e1a', stroke: '#2d5a2d', icon: '▬', badgeColor: '#22c55e', cornerRadius: 2 },
  Label: { fill: 'transparent', stroke: '#404060', icon: 'A', badgeColor: '#f59e0b', cornerRadius: 0 },
  Editbox: { fill: '#0f0f1a', stroke: '#3a3a5a', icon: '✎', badgeColor: '#3b82f6', cornerRadius: 2 },
  Listbox: { fill: '#15152a', stroke: '#3a3a5a', icon: '☰', badgeColor: '#06b6d4', cornerRadius: 2 },
  Combobox: { fill: '#15152a', stroke: '#3a3a5a', icon: '▾', badgeColor: '#06b6d4', cornerRadius: 2 },
  Slider: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⬌', badgeColor: '#f97316', cornerRadius: 2 },
  STMLbox: { fill: '#1a1a2a', stroke: '#3a3a5a', icon: '📝', badgeColor: '#3b82f6', cornerRadius: 2 },

  // EQ-specific types
  InvSlot: { fill: '#2a2a1e', stroke: '#5a5a3a', icon: '📦', badgeColor: '#ca8a04', cornerRadius: 2 },
  SpellGem: { fill: '#1e2a3e', stroke: '#3a4a6a', icon: '💎', badgeColor: '#3b82f6', cornerRadius: 4 },
  HotButton: { fill: '#2e1e2e', stroke: '#5a3a5a', icon: '🔥', badgeColor: '#ef4444', cornerRadius: 4 },

  // Static/display types
  StaticAnimation: { fill: '#2a1a2a', stroke: '#5a3a5a', icon: '▶', badgeColor: '#ec4899', cornerRadius: 2 },
  StaticText: { fill: 'transparent', stroke: '#404060', icon: 'T', badgeColor: '#9ca3af', cornerRadius: 0 },
  StaticFrame: { fill: '#1a1a2e', stroke: '#4a4a6a', icon: '▭', badgeColor: '#64748b', cornerRadius: 2 },

  // Other
  Browser: { fill: '#15152a', stroke: '#3a3a5a', icon: '🌐', badgeColor: '#3b82f6', cornerRadius: 2 },
  TreeView: { fill: '#15152a', stroke: '#3a3a5a', icon: '🌳', badgeColor: '#22c55e', cornerRadius: 2 },
  Grid: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '⊞', badgeColor: '#6366f1', cornerRadius: 2 },
  RadioGroup: { fill: '#2a2a3e', stroke: '#4a4a6a', icon: '◉', badgeColor: '#8b5cf6', cornerRadius: 2 },
  Holder: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '▢', badgeColor: '#64748b', cornerRadius: 2 },
  Header: { fill: 'transparent', stroke: '#404060', icon: 'H', badgeColor: '#94a3b8', cornerRadius: 0 },
  Layout: { fill: '#1a1a2e', stroke: '#3a3a5a', icon: '▤', badgeColor: '#6366f1', cornerRadius: 2 },
  Choices: { fill: '#15152a', stroke: '#3a3a5a', icon: '☰', badgeColor: '#06b6d4', cornerRadius: 2 },
}

const defaultTypeConfig = { fill: '#2a2a3e', stroke: '#404060', icon: '◇', badgeColor: '#6b7280', cornerRadius: 0 }

// Get element config based on type
function getTypeConfig(element: ScreenPiece) {
  return elementTypeConfig[element.type] || defaultTypeConfig
}

// Get element color based on type
function getElementColor(element: ScreenPiece): string {
  return getTypeConfig(element).fill
}

// Get border color for element
function getBorderColor(element: ScreenPiece): string {
  if (selectionStore.isSelected(element.id)) {
    return '#7c3aed'
  }
  if (selectionStore.hoveredId === element.id) {
    return '#8b8bbb'
  }
  return getTypeConfig(element).stroke
}

// Get border width
function getBorderWidth(element: ScreenPiece): number {
  if (selectionStore.isSelected(element.id)) return 2
  if (selectionStore.hoveredId === element.id) return 2
  return 1
}

// Get corner radius for element
function getCornerRadius(element: ScreenPiece): number {
  return getTypeConfig(element).cornerRadius
}

// Get gauge fill color based on EQ type
function getGaugeFillColor(element: ScreenPiece): string {
  if ('eqType' in element) {
    const eqType = (element as { eqType?: number }).eqType
    switch (eqType) {
      case 1: return '#ef4444' // HP - red
      case 2: return '#3b82f6' // Mana - blue
      case 3: return '#eab308' // Endurance - yellow
      case 6: return '#8b5cf6' // Experience - purple
      default: return '#22c55e' // Default green
    }
  }
  return '#22c55e'
}

// Handle element click for selection
function handleElementClick(element: ScreenPiece, event: any) {
  event.cancelBubble = true
  const evt = event.evt as MouseEvent
  selectionStore.select(element.id, evt.ctrlKey || evt.metaKey || evt.shiftKey)
}

// Handle stage click to deselect
function handleStageClick() {
  selectionStore.clearSelection()
}

// Handle mouse enter/leave for hover
function handleElementMouseEnter(element: ScreenPiece) {
  selectionStore.setHovered(element.id)
}

function handleElementMouseLeave() {
  selectionStore.setHovered(null)
}

// Handle drag start
function handleDragStart(element: ScreenPiece, event: any) {
  if (isResizing.value) return

  if (!selectionStore.isSelected(element.id)) {
    selectionStore.select(element.id)
  }

  isDragging.value = true
  dragStartPos.value = { x: event.evt.clientX, y: event.evt.clientY }
  dragStartElementPos.value = { x: element.location.x, y: element.location.y }
}

// Handle drag end
function handleDragEnd(element: ScreenPiece, event: any) {
  if (!isDragging.value) return

  const newX = Math.round(event.target.x())
  const newY = Math.round(event.target.y())

  const oldLocation = { ...dragStartElementPos.value }
  const newLocation = { x: newX, y: newY }

  elementsStore.updateElement(element.id, { location: newLocation })

  historyStore.push({
    description: `Move ${element.screenId}`,
    undo: () => elementsStore.updateElement(element.id, { location: oldLocation }),
    redo: () => elementsStore.updateElement(element.id, { location: newLocation }),
  })

  isDragging.value = false
}

// Resize handle positions
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

function getHandlePositions(element: ScreenPiece): { pos: HandlePosition; x: number; y: number; cursor: string }[] {
  const x = getElementX(element)
  const y = getElementY(element)
  const { cx, cy } = element.size
  const handleSize = 8
  const half = handleSize / 2

  return [
    { pos: 'nw', x: x - half, y: y - half, cursor: 'nwse-resize' },
    { pos: 'n', x: x + cx / 2 - half, y: y - half, cursor: 'ns-resize' },
    { pos: 'ne', x: x + cx - half, y: y - half, cursor: 'nesw-resize' },
    { pos: 'e', x: x + cx - half, y: y + cy / 2 - half, cursor: 'ew-resize' },
    { pos: 'se', x: x + cx - half, y: y + cy - half, cursor: 'nwse-resize' },
    { pos: 's', x: x + cx / 2 - half, y: y + cy - half, cursor: 'ns-resize' },
    { pos: 'sw', x: x - half, y: y + cy - half, cursor: 'nesw-resize' },
    { pos: 'w', x: x - half, y: y + cy / 2 - half, cursor: 'ew-resize' },
  ]
}

// Handle resize drag start
function handleResizeStart(element: ScreenPiece, handle: HandlePosition, event: any) {
  event.cancelBubble = true
  isResizing.value = true
  resizeHandle.value = handle
  resizeStartSize.value = { ...element.size }
  resizeStartPos.value = { x: event.evt.clientX, y: event.evt.clientY }
  resizeStartLocation.value = { ...element.location }
}

// Handle resize drag
function handleResizeDrag(element: ScreenPiece, event: any) {
  if (!isResizing.value || !resizeHandle.value) return

  const dx = (event.evt.clientX - resizeStartPos.value.x) / zoom.value
  const dy = (event.evt.clientY - resizeStartPos.value.y) / zoom.value

  let newX = resizeStartLocation.value.x
  let newY = resizeStartLocation.value.y
  let newCx = resizeStartSize.value.cx
  let newCy = resizeStartSize.value.cy

  const handle = resizeHandle.value
  const minSize = 20

  // Adjust size based on handle
  if (handle.includes('e')) {
    newCx = Math.max(minSize, resizeStartSize.value.cx + dx)
  }
  if (handle.includes('w')) {
    const widthChange = Math.min(dx, resizeStartSize.value.cx - minSize)
    newX = resizeStartLocation.value.x + widthChange
    newCx = resizeStartSize.value.cx - widthChange
  }
  if (handle.includes('s')) {
    newCy = Math.max(minSize, resizeStartSize.value.cy + dy)
  }
  if (handle.includes('n')) {
    const heightChange = Math.min(dy, resizeStartSize.value.cy - minSize)
    newY = resizeStartLocation.value.y + heightChange
    newCy = resizeStartSize.value.cy - heightChange
  }

  // Update element
  elementsStore.updateElement(element.id, {
    location: { x: Math.round(newX), y: Math.round(newY) },
    size: { cx: Math.round(newCx), cy: Math.round(newCy) },
  })
}

// Handle resize drag end
function handleResizeEnd(element: ScreenPiece) {
  if (!isResizing.value) return

  const oldLocation = { ...resizeStartLocation.value }
  const oldSize = { ...resizeStartSize.value }
  const newLocation = { ...element.location }
  const newSize = { ...element.size }

  historyStore.push({
    description: `Resize ${element.screenId}`,
    undo: () => elementsStore.updateElement(element.id, { location: oldLocation, size: oldSize }),
    redo: () => elementsStore.updateElement(element.id, { location: newLocation, size: newSize }),
  })

  isResizing.value = false
  resizeHandle.value = null
}

// Get font size based on EQ font scale (0-6)
function getFontSize(font?: number): number {
  const sizes = [10, 12, 14, 16, 18, 20, 24]
  return sizes[font ?? 2] || 14
}

// Get sample text for element
function getElementText(element: ScreenPiece): string {
  if (element.text) return element.text

  if ('eqType' in element) {
    const eqType = (element as { eqType?: number }).eqType
    switch (eqType) {
      case 1: return 'PlayerName'
      case 2: return '65'
      case 17: return '1500'
      case 28: return 'Target Name'
      default: return ''
    }
  }

  return ''
}

// Get gauge fill percentage
function getGaugeFillPercent(element: ScreenPiece): number {
  if (element.type !== 'Gauge') return 0
  if ('eqType' in element) {
    const eqType = (element as { eqType?: number }).eqType
    switch (eqType) {
      case 1: return 0.75
      case 2: return 0.80
      case 3: return 0.90
      case 6: return 0.60
      default: return 0.5
    }
  }
  return 0.5
}

// Zoom controls
function setZoom(newZoom: number) {
  zoom.value = Math.max(0.25, Math.min(4, newZoom))
}

function handleWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.1 : 0.1
    setZoom(zoom.value + delta)
  }
}

// Drag and drop file handling
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = Array.from(event.dataTransfer?.files || [])
  const xmlFiles = files.filter(f => f.name.endsWith('.xml'))

  if (xmlFiles.length > 0) {
    await projectStore.loadFiles(xmlFiles)
  }
}

// Recursive element rendering helper
function getAllElements(elements: ScreenPiece[]): ScreenPiece[] {
  const result: ScreenPiece[] = []
  const seen = new Set<string>()

  const traverse = (els: ScreenPiece[]): void => {
    for (const el of els) {
      // Skip if we've already seen this element (prevents duplicate keys)
      if (seen.has(el.id)) {
        continue
      }
      seen.add(el.id)
      result.push(el)
      if (el.children.length > 0) {
        traverse(el.children)
      }
    }
  }

  traverse(elements)
  return result
}

const flatElements = computed(() => getAllElements(rootElements.value))

// Calculate bounding box of all elements for centering
const contentBounds = computed(() => {
  if (flatElements.value.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of flatElements.value) {
    const x = el.location.x
    const y = el.location.y
    const right = x + el.size.cx
    const bottom = y + el.size.cy

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, right)
    maxY = Math.max(maxY, bottom)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
})

// Calculate offset to center content on canvas
const canvasOffset = computed(() => {
  const bounds = contentBounds.value
  if (bounds.width === 0 && bounds.height === 0) {
    return { x: 0, y: 0 }
  }

  const viewportWidth = stageConfig.value.width / zoom.value
  const viewportHeight = stageConfig.value.height / zoom.value

  // Center the content bounding box in the viewport
  const offsetX = (viewportWidth - bounds.width) / 2 - bounds.minX
  const offsetY = (viewportHeight - bounds.height) / 2 - bounds.minY

  return { x: offsetX, y: offsetY }
})

// Get element position with centering offset applied
function getElementX(element: ScreenPiece): number {
  return element.location.x + canvasOffset.value.x
}

function getElementY(element: ScreenPiece): number {
  return element.location.y + canvasOffset.value.y
}
</script>

<template>
  <div
    class="editor-canvas"
    ref="containerRef"
    @wheel="handleWheel"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="canvas-toolbar">
      <span class="toolbar-group">
        <button class="btn" @click="setZoom(zoom - 0.25)">-</button>
        <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
        <button class="btn" @click="setZoom(zoom + 0.25)">+</button>
      </span>
      <span class="toolbar-group">
        <button
          class="btn"
          :class="{ active: showGrid }"
          @click="showGrid = !showGrid"
          title="Toggle Grid"
        >
          Grid
        </button>
        <button
          class="btn"
          :class="{ active: showSnapGuides }"
          @click="showSnapGuides = !showSnapGuides"
          title="Toggle Snap Guides"
        >
          Snap
        </button>
      </span>
      <span class="toolbar-info">
        <span v-if="selectionStore.singleSelection" class="selection-info">
          {{ selectionStore.singleSelection.type }}: {{ selectionStore.singleSelection.screenId }}
          ({{ selectionStore.singleSelection.size.cx }}x{{ selectionStore.singleSelection.size.cy }})
        </span>
        <span v-else-if="selectionStore.selectionCount > 1" class="selection-info">
          {{ selectionStore.selectionCount }} elements selected
        </span>
      </span>
    </div>

    <AlignmentToolbar />

    <div class="canvas-viewport">
      <v-stage
        :config="{
          ...stageConfig,
          scaleX: zoom,
          scaleY: zoom,
        }"
        @click="handleStageClick"
      >
        <!-- Grid layer -->
        <v-layer v-if="showGrid">
          <v-line
            v-for="line in getGridLines()"
            :key="line.key"
            :config="{
              points: line.points,
              stroke: '#252535',
              strokeWidth: 1,
              listening: false,
            }"
          />
        </v-layer>

        <!-- Elements layer -->
        <v-layer>
          <!-- Empty state message -->
          <v-text
            v-if="flatElements.length === 0"
            :config="{
              x: stageConfig.width / zoom / 2 - 150,
              y: stageConfig.height / zoom / 2 - 40,
              text: 'No UI loaded\n\nDrag & drop EQUI_*.xml files here\nor use File > Open',
              fontSize: 16,
              fill: '#707070',
              align: 'center',
              width: 300,
            }"
          />

          <!-- Render all elements -->
          <v-group
            v-for="element in flatElements"
            :key="element.id"
            :config="{
              x: getElementX(element),
              y: getElementY(element),
              draggable: !isResizing,
            }"
            @click="(e: any) => handleElementClick(element, e)"
            @mouseenter="() => handleElementMouseEnter(element)"
            @mouseleave="handleElementMouseLeave"
            @dragstart="(e: any) => handleDragStart(element, e)"
            @dragend="(e: any) => handleDragEnd(element, e)"
          >
            <!-- Shadow for depth -->
            <v-rect
              v-if="element.type === 'Screen' || element.type === 'Button'"
              :config="{
                x: 2,
                y: 2,
                width: element.size.cx,
                height: element.size.cy,
                fill: 'rgba(0,0,0,0.3)',
                cornerRadius: getCornerRadius(element),
                listening: false,
              }"
            />

            <!-- Element background -->
            <v-rect
              :config="{
                width: element.size.cx,
                height: element.size.cy,
                fill: getElementColor(element),
                stroke: getBorderColor(element),
                strokeWidth: getBorderWidth(element),
                cornerRadius: getCornerRadius(element),
                shadowColor: selectionStore.isSelected(element.id) ? '#7c3aed' : 'transparent',
                shadowBlur: selectionStore.isSelected(element.id) ? 8 : 0,
                shadowOpacity: 0.5,
              }"
            />

            <!-- Inner border highlight for buttons -->
            <v-rect
              v-if="element.type === 'Button' && element.size.cx > 4 && element.size.cy > 4"
              :config="{
                x: 1,
                y: 1,
                width: Math.max(0, element.size.cx - 2),
                height: Math.max(0, element.size.cy - 2),
                fill: 'transparent',
                stroke: 'rgba(255,255,255,0.1)',
                strokeWidth: 1,
                cornerRadius: Math.max(0, getCornerRadius(element) - 1),
                listening: false,
              }"
            />

            <!-- Screen titlebar -->
            <v-rect
              v-if="element.type === 'Screen' && element.size.cx > 4"
              :config="{
                x: 1,
                y: 1,
                width: Math.max(0, element.size.cx - 2),
                height: 22,
                fill: 'rgba(100,100,140,0.3)',
                cornerRadius: [3, 3, 0, 0],
                listening: false,
              }"
            />

            <!-- Gauge background track -->
            <v-rect
              v-if="element.type === 'Gauge' && element.size.cx > 4 && element.size.cy > 4"
              :config="{
                x: 2,
                y: 2,
                width: Math.max(1, element.size.cx - 4),
                height: Math.max(1, element.size.cy - 4),
                fill: 'rgba(0,0,0,0.4)',
                cornerRadius: 1,
                listening: false,
              }"
            />

            <!-- Gauge fill -->
            <v-rect
              v-if="element.type === 'Gauge' && element.size.cx > 4 && element.size.cy > 4"
              :config="{
                x: 2,
                y: 2,
                width: Math.max(1, element.size.cx - 4) * getGaugeFillPercent(element),
                height: Math.max(1, element.size.cy - 4),
                fill: getGaugeFillColor(element),
                cornerRadius: 1,
                listening: false,
              }"
            />

            <!-- Gauge percentage text -->
            <v-text
              v-if="element.type === 'Gauge' && element.size.cy > 4"
              :config="{
                x: 0,
                y: 0,
                width: element.size.cx,
                height: element.size.cy,
                text: Math.round(getGaugeFillPercent(element) * 100) + '%',
                fontSize: Math.max(8, Math.min(element.size.cy - 4, 14)),
                fill: '#ffffff',
                align: 'center',
                verticalAlign: 'middle',
                fontStyle: 'bold',
                shadowColor: '#000000',
                shadowBlur: 2,
                listening: false,
              }"
            />

            <!-- Editbox cursor simulation -->
            <v-rect
              v-if="element.type === 'Editbox'"
              :config="{
                x: 6,
                y: element.size.cy / 2 - 8,
                width: 1,
                height: 16,
                fill: '#a0a0a0',
                listening: false,
              }"
            />

            <!-- Listbox rows simulation -->
            <template v-if="element.type === 'Listbox' && element.size.cy > 38">
              <v-line
                v-for="i in Math.max(0, Math.min(Math.floor((element.size.cy - 20) / 18), 5))"
                :key="`listrow-${i}`"
                :config="{
                  points: [4, 18 + i * 18, Math.max(5, element.size.cx - 4), 18 + i * 18],
                  stroke: 'rgba(255,255,255,0.1)',
                  strokeWidth: 1,
                  listening: false,
                }"
              />
            </template>

            <!-- Element label (screenId) -->
            <v-label
              :config="{
                x: 0,
                y: element.type === 'Screen' ? 3 : -18,
                listening: false,
              }"
            >
              <v-tag
                :config="{
                  fill: getTypeConfig(element).badgeColor,
                  cornerRadius: 2,
                  pointerDirection: element.type === 'Screen' ? '' : 'down',
                  pointerWidth: 6,
                  pointerHeight: 4,
                  shadowColor: '#000000',
                  shadowBlur: 2,
                  shadowOpacity: 0.3,
                }"
              />
              <v-text
                :config="{
                  text: ` ${getTypeConfig(element).icon} ${element.screenId} `,
                  fontSize: 11,
                  fill: '#ffffff',
                  fontStyle: 'bold',
                  padding: 2,
                }"
              />
            </v-label>

            <!-- Button text -->
            <v-text
              v-if="element.type === 'Button'"
              :config="{
                x: 0,
                y: 0,
                width: element.size.cx,
                height: element.size.cy,
                text: getElementText(element) || 'Button',
                fontSize: getFontSize(element.font),
                fill: element.textColor ? rgbToCss(element.textColor) : '#e0e0e0',
                align: 'center',
                verticalAlign: 'middle',
                listening: false,
              }"
            />

            <!-- Label text -->
            <v-text
              v-if="element.type === 'Label'"
              :config="{
                x: 2,
                y: 2,
                width: element.size.cx - 4,
                height: element.size.cy - 4,
                text: getElementText(element) || 'Label Text',
                fontSize: getFontSize(element.font),
                fill: element.textColor ? rgbToCss(element.textColor) : '#d0d0d0',
                verticalAlign: 'middle',
                listening: false,
              }"
            />

            <!-- Screen title text -->
            <v-text
              v-if="element.type === 'Screen'"
              :config="{
                x: 24,
                y: 5,
                text: element.screenId,
                fontSize: 12,
                fill: '#c0c0d0',
                fontStyle: 'bold',
                listening: false,
              }"
            />

            <!-- Editbox placeholder text -->
            <v-text
              v-if="element.type === 'Editbox'"
              :config="{
                x: 10,
                y: 0,
                width: element.size.cx - 14,
                height: element.size.cy,
                text: getElementText(element) || 'Enter text...',
                fontSize: getFontSize(element.font),
                fill: '#808080',
                verticalAlign: 'middle',
                listening: false,
              }"
            />

            <!-- Listbox header -->
            <v-text
              v-if="element.type === 'Listbox'"
              :config="{
                x: 4,
                y: 4,
                text: 'Column 1          Column 2',
                fontSize: 11,
                fill: '#a0a0b0',
                fontStyle: 'bold',
                listening: false,
              }"
            />

            <!-- InvSlot visual (inventory grid square) -->
            <template v-if="element.type === 'InvSlot' && element.size.cx > 4 && element.size.cy > 4">
              <v-rect
                :config="{
                  x: 2,
                  y: 2,
                  width: Math.max(1, element.size.cx - 4),
                  height: Math.max(1, element.size.cy - 4),
                  fill: 'rgba(0,0,0,0.3)',
                  stroke: '#4a4a3a',
                  strokeWidth: 1,
                  cornerRadius: 2,
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 0,
                  y: 0,
                  width: element.size.cx,
                  height: element.size.cy,
                  text: '?',
                  fontSize: Math.min(element.size.cx, element.size.cy) * 0.6,
                  fill: '#5a5a4a',
                  align: 'center',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
            </template>

            <!-- SpellGem visual (gem shape) -->
            <template v-if="element.type === 'SpellGem' && element.size.cx > 4 && element.size.cy > 4">
              <v-rect
                :config="{
                  x: 2,
                  y: 2,
                  width: Math.max(1, element.size.cx - 4),
                  height: Math.max(1, element.size.cy - 4),
                  fill: 'linear-gradient(135deg, #3a5a8a, #1a2a4a)',
                  stroke: '#5a7aaa',
                  strokeWidth: 1,
                  cornerRadius: Math.min(4, Math.max(0, Math.min(element.size.cx, element.size.cy) / 2 - 2)),
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 0,
                  y: 0,
                  width: element.size.cx,
                  height: element.size.cy,
                  text: '💎',
                  fontSize: Math.min(element.size.cx, element.size.cy) * 0.5,
                  align: 'center',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
            </template>

            <!-- HotButton visual -->
            <template v-if="element.type === 'HotButton' && element.size.cx > 4 && element.size.cy > 4">
              <v-rect
                :config="{
                  x: 2,
                  y: 2,
                  width: Math.max(1, element.size.cx - 4),
                  height: Math.max(1, element.size.cy - 4),
                  fill: 'rgba(60,30,60,0.5)',
                  stroke: '#6a4a6a',
                  strokeWidth: 1,
                  cornerRadius: Math.min(3, Math.max(0, Math.min(element.size.cx, element.size.cy) / 2 - 2)),
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 0,
                  y: 0,
                  width: element.size.cx,
                  height: element.size.cy,
                  text: (element as any).buttonIndex ?? '1',
                  fontSize: Math.min(element.size.cx, element.size.cy) * 0.4,
                  fill: '#d0a0d0',
                  align: 'center',
                  verticalAlign: 'middle',
                  fontStyle: 'bold',
                  listening: false,
                }"
              />
            </template>

            <!-- Slider visual -->
            <template v-if="element.type === 'Slider' && element.size.cx > 8 && element.size.cy > 12">
              <v-rect
                :config="{
                  x: 4,
                  y: element.size.cy / 2 - 2,
                  width: Math.max(1, element.size.cx - 8),
                  height: 4,
                  fill: 'rgba(0,0,0,0.4)',
                  cornerRadius: 2,
                  listening: false,
                }"
              />
              <v-rect
                :config="{
                  x: element.size.cx * 0.4,
                  y: element.size.cy / 2 - 6,
                  width: 12,
                  height: 12,
                  fill: '#5a5a8a',
                  stroke: '#8a8aba',
                  strokeWidth: 1,
                  cornerRadius: 2,
                  listening: false,
                }"
              />
            </template>

            <!-- StaticAnimation visual -->
            <template v-if="element.type === 'StaticAnimation'">
              <v-text
                :config="{
                  x: 0,
                  y: 0,
                  width: element.size.cx,
                  height: element.size.cy,
                  text: '▶ ' + ((element as any).animation || 'Animation'),
                  fontSize: 11,
                  fill: '#c0a0c0',
                  align: 'center',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
            </template>

            <!-- Combobox visual (dropdown) -->
            <template v-if="element.type === 'Combobox'">
              <v-text
                :config="{
                  x: 6,
                  y: 0,
                  width: element.size.cx - 24,
                  height: element.size.cy,
                  text: 'Select...',
                  fontSize: getFontSize(element.font),
                  fill: '#808080',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: element.size.cx - 18,
                  y: 0,
                  width: 16,
                  height: element.size.cy,
                  text: '▾',
                  fontSize: 14,
                  fill: '#a0a0b0',
                  align: 'center',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
            </template>

            <!-- TileLayoutBox visual (grid pattern) -->
            <template v-if="element.type === 'TileLayoutBox' && element.size.cx > 30 && element.size.cy > 30">
              <v-line
                v-for="i in Math.max(0, Math.min(4, Math.floor(element.size.cx / 30)))"
                :key="`tile-v-${i}`"
                :config="{
                  points: [i * 30, 0, i * 30, element.size.cy],
                  stroke: 'rgba(100,100,150,0.3)',
                  strokeWidth: 1,
                  dash: [2, 2],
                  listening: false,
                }"
              />
              <v-line
                v-for="i in Math.max(0, Math.min(4, Math.floor(element.size.cy / 30)))"
                :key="`tile-h-${i}`"
                :config="{
                  points: [0, i * 30, element.size.cx, i * 30],
                  stroke: 'rgba(100,100,150,0.3)',
                  strokeWidth: 1,
                  dash: [2, 2],
                  listening: false,
                }"
              />
            </template>

            <!-- Grid visual -->
            <template v-if="element.type === 'Grid'">
              <v-line
                v-for="i in Math.min(6, (element as any).cols || 4)"
                :key="`grid-v-${i}`"
                :config="{
                  points: [i * (element.size.cx / ((element as any).cols || 4)), 0, i * (element.size.cx / ((element as any).cols || 4)), element.size.cy],
                  stroke: 'rgba(100,100,150,0.4)',
                  strokeWidth: 1,
                  listening: false,
                }"
              />
              <v-line
                v-for="i in Math.min(6, (element as any).rows || 4)"
                :key="`grid-h-${i}`"
                :config="{
                  points: [0, i * (element.size.cy / ((element as any).rows || 4)), element.size.cx, i * (element.size.cy / ((element as any).rows || 4))],
                  stroke: 'rgba(100,100,150,0.4)',
                  strokeWidth: 1,
                  listening: false,
                }"
              />
            </template>

            <!-- RadioGroup visual -->
            <template v-if="element.type === 'RadioGroup'">
              <v-circle
                :config="{
                  x: 10,
                  y: element.size.cy / 2,
                  radius: 6,
                  fill: 'transparent',
                  stroke: '#6a6a8a',
                  strokeWidth: 2,
                  listening: false,
                }"
              />
              <v-circle
                :config="{
                  x: 10,
                  y: element.size.cy / 2,
                  radius: 3,
                  fill: '#8b5cf6',
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 22,
                  y: 0,
                  width: element.size.cx - 26,
                  height: element.size.cy,
                  text: 'Option',
                  fontSize: 12,
                  fill: '#a0a0b0',
                  verticalAlign: 'middle',
                  listening: false,
                }"
              />
            </template>

            <!-- TabBox visual (tab headers) -->
            <template v-if="element.type === 'TabBox'">
              <v-rect
                :config="{
                  x: 0,
                  y: 0,
                  width: 60,
                  height: 20,
                  fill: 'rgba(100,100,140,0.4)',
                  stroke: '#5a5a7a',
                  strokeWidth: 1,
                  cornerRadius: [4, 4, 0, 0],
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 4,
                  y: 2,
                  text: 'Tab 1',
                  fontSize: 11,
                  fill: '#c0c0d0',
                  listening: false,
                }"
              />
              <v-rect
                :config="{
                  x: 62,
                  y: 0,
                  width: 60,
                  height: 20,
                  fill: 'rgba(60,60,80,0.3)',
                  stroke: '#4a4a6a',
                  strokeWidth: 1,
                  cornerRadius: [4, 4, 0, 0],
                  listening: false,
                }"
              />
              <v-text
                :config="{
                  x: 66,
                  y: 2,
                  text: 'Tab 2',
                  fontSize: 11,
                  fill: '#808090',
                  listening: false,
                }"
              />
            </template>
          </v-group>
        </v-layer>

        <!-- Selection handles layer -->
        <v-layer>
          <template v-for="element in selectionStore.selectedElements" :key="`handles-${element.id}`">
            <!-- Selection outline -->
            <v-rect
              :config="{
                x: getElementX(element) - 1,
                y: getElementY(element) - 1,
                width: element.size.cx + 2,
                height: element.size.cy + 2,
                stroke: '#7c3aed',
                strokeWidth: 1,
                dash: [4, 4],
                listening: false,
              }"
            />

            <!-- Resize handles -->
            <v-rect
              v-for="handle in getHandlePositions(element)"
              :key="`handle-${handle.pos}`"
              :config="{
                x: handle.x,
                y: handle.y,
                width: 8,
                height: 8,
                fill: '#7c3aed',
                stroke: '#ffffff',
                strokeWidth: 1,
                draggable: true,
              }"
              @dragstart="(e: any) => handleResizeStart(element, handle.pos, e)"
              @dragmove="(e: any) => handleResizeDrag(element, e)"
              @dragend="() => handleResizeEnd(element)"
            />
          </template>
        </v-layer>

        <!-- Snap guides layer -->
        <v-layer v-if="showSnapGuides">
          <SnapGuides
            ref="snapGuidesRef"
            :stage-width="stageConfig.width"
            :stage-height="stageConfig.height"
            :zoom="zoom"
            :enabled="showSnapGuides"
          />
        </v-layer>
      </v-stage>
    </div>

    <div class="canvas-status">
      <span>{{ flatElements.length }} elements</span>
      <span class="text-muted">|</span>
      <span class="text-muted">{{ Math.round(stageConfig.width / zoom) }} x {{ Math.round(stageConfig.height / zoom) }}</span>
    </div>
  </div>
</template>

<style scoped>
.editor-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.toolbar-info {
  flex: 1;
  text-align: right;
}

.selection-info {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.zoom-level {
  min-width: 48px;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.btn.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
}

.canvas-viewport {
  flex: 1;
  overflow: hidden;
  background:
    linear-gradient(45deg, #1a1a2a 25%, transparent 25%),
    linear-gradient(-45deg, #1a1a2a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1a1a2a 75%),
    linear-gradient(-45deg, transparent 75%, #1a1a2a 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  background-color: #15152a;
}

.canvas-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}
</style>
