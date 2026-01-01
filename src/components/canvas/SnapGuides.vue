<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useElementsStore } from '@/stores/elementsStore'
import { useSelectionStore } from '@/stores/selectionStore'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'

const props = defineProps<{
  stageWidth: number
  stageHeight: number
  zoom: number
  enabled?: boolean
}>()

const elementsStore = useElementsStore()
const selectionStore = useSelectionStore()

const SNAP_THRESHOLD = 8 // pixels

interface GuideLine {
  orientation: 'h' | 'v'
  position: number
  start: number
  end: number
}

const guides = ref<GuideLine[]>([])

const selectedElement = computed(() => selectionStore.singleSelection)
const otherElements = computed(() => {
  if (!selectedElement.value) return []
  return elementsStore.topLevelElements.filter(
    el => el.id !== selectedElement.value?.id
  )
})

// Calculate snap guides based on current selection
function calculateGuides(element: ScreenPiece): GuideLine[] {
  const result: GuideLine[] = []
  if (!props.enabled) return result

  const selLeft = element.location?.x || 0
  const selTop = element.location?.y || 0
  const selRight = selLeft + (element.size?.cx || 100)
  const selBottom = selTop + (element.size?.cy || 50)
  const selCenterX = selLeft + (element.size?.cx || 100) / 2
  const selCenterY = selTop + (element.size?.cy || 50) / 2

  for (const other of otherElements.value) {
    const otherLeft = other.location?.x || 0
    const otherTop = other.location?.y || 0
    const otherRight = otherLeft + (other.size?.cx || 100)
    const otherBottom = otherTop + (other.size?.cy || 50)
    const otherCenterX = otherLeft + (other.size?.cx || 100) / 2
    const otherCenterY = otherTop + (other.size?.cy || 50) / 2

    // Vertical guides (for X alignment)
    // Left to left
    if (Math.abs(selLeft - otherLeft) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'v',
        position: otherLeft,
        start: Math.min(selTop, otherTop),
        end: Math.max(selBottom, otherBottom),
      })
    }
    // Right to right
    if (Math.abs(selRight - otherRight) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'v',
        position: otherRight,
        start: Math.min(selTop, otherTop),
        end: Math.max(selBottom, otherBottom),
      })
    }
    // Left to right
    if (Math.abs(selLeft - otherRight) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'v',
        position: otherRight,
        start: Math.min(selTop, otherTop),
        end: Math.max(selBottom, otherBottom),
      })
    }
    // Right to left
    if (Math.abs(selRight - otherLeft) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'v',
        position: otherLeft,
        start: Math.min(selTop, otherTop),
        end: Math.max(selBottom, otherBottom),
      })
    }
    // Center to center (vertical)
    if (Math.abs(selCenterX - otherCenterX) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'v',
        position: otherCenterX,
        start: Math.min(selTop, otherTop),
        end: Math.max(selBottom, otherBottom),
      })
    }

    // Horizontal guides (for Y alignment)
    // Top to top
    if (Math.abs(selTop - otherTop) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'h',
        position: otherTop,
        start: Math.min(selLeft, otherLeft),
        end: Math.max(selRight, otherRight),
      })
    }
    // Bottom to bottom
    if (Math.abs(selBottom - otherBottom) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'h',
        position: otherBottom,
        start: Math.min(selLeft, otherLeft),
        end: Math.max(selRight, otherRight),
      })
    }
    // Top to bottom
    if (Math.abs(selTop - otherBottom) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'h',
        position: otherBottom,
        start: Math.min(selLeft, otherLeft),
        end: Math.max(selRight, otherRight),
      })
    }
    // Bottom to top
    if (Math.abs(selBottom - otherTop) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'h',
        position: otherTop,
        start: Math.min(selLeft, otherLeft),
        end: Math.max(selRight, otherRight),
      })
    }
    // Center to center (horizontal)
    if (Math.abs(selCenterY - otherCenterY) < SNAP_THRESHOLD) {
      result.push({
        orientation: 'h',
        position: otherCenterY,
        start: Math.min(selLeft, otherLeft),
        end: Math.max(selRight, otherRight),
      })
    }
  }

  return result
}

// Watch for selection changes
watch(
  () => selectedElement.value,
  (el) => {
    if (el) {
      guides.value = calculateGuides(el)
    } else {
      guides.value = []
    }
  },
  { deep: true }
)

// Expose method for external updates during drag
function updateGuides() {
  if (selectedElement.value) {
    guides.value = calculateGuides(selectedElement.value)
  }
}

defineExpose({ updateGuides, guides })
</script>

<template>
  <v-group>
    <template v-for="(guide, idx) in guides" :key="idx">
      <v-line
        v-if="guide.orientation === 'v'"
        :config="{
          points: [guide.position, guide.start - 10, guide.position, guide.end + 10],
          stroke: '#ff6b6b',
          strokeWidth: 1 / zoom,
          dash: [4 / zoom, 4 / zoom],
          listening: false,
        }"
      />
      <v-line
        v-else
        :config="{
          points: [guide.start - 10, guide.position, guide.end + 10, guide.position],
          stroke: '#ff6b6b',
          strokeWidth: 1 / zoom,
          dash: [4 / zoom, 4 / zoom],
          listening: false,
        }"
      />
    </template>
  </v-group>
</template>
