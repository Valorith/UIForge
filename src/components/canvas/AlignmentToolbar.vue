<script setup lang="ts">
import { computed } from 'vue'
import { useSelectionStore } from '@/stores/selectionStore'
import { useElementsStore } from '@/stores/elementsStore'
import { useHistoryStore } from '@/stores/historyStore'

const selectionStore = useSelectionStore()
const elementsStore = useElementsStore()
const historyStore = useHistoryStore()

const hasMultipleSelection = computed(
  () => selectionStore.selectedIds.length >= 2
)
const hasSingleSelection = computed(
  () => selectionStore.selectedIds.length === 1
)

function getSelectedElements() {
  return selectionStore.selectedIds
    .map(id => elementsStore.getElementById(id))
    .filter((el): el is NonNullable<typeof el> => el !== undefined)
}

function alignLeft() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const minX = Math.min(...elements.map(el => el.location?.x || 0))
  const oldPositions = elements.map(el => ({ id: el.id, x: el.location?.x || 0 }))

  for (const el of elements) {
    elementsStore.updateElement(el.id, {
      location: { x: minX, y: el.location?.y || 0 },
    })
  }

  historyStore.push({
    description: 'Align left',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: pos.x, y: el.location?.y || 0 },
          })
        }
      }
    },
    redo: () => {
      for (const el of elements) {
        elementsStore.updateElement(el.id, {
          location: { x: minX, y: el.location?.y || 0 },
        })
      }
    },
  })
}

function alignCenter() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const centers = elements.map(el => (el.location?.x || 0) + (el.size?.cx || 100) / 2)
  const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length
  const oldPositions = elements.map(el => ({ id: el.id, x: el.location?.x || 0 }))

  for (const el of elements) {
    const newX = avgCenter - (el.size?.cx || 100) / 2
    elementsStore.updateElement(el.id, {
      location: { x: newX, y: el.location?.y || 0 },
    })
  }

  historyStore.push({
    description: 'Align center',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: pos.x, y: el.location?.y || 0 },
          })
        }
      }
    },
    redo: () => alignCenter(),
  })
}

function alignRight() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const maxRight = Math.max(
    ...elements.map(el => (el.location?.x || 0) + (el.size?.cx || 100))
  )
  const oldPositions = elements.map(el => ({ id: el.id, x: el.location?.x || 0 }))

  for (const el of elements) {
    const newX = maxRight - (el.size?.cx || 100)
    elementsStore.updateElement(el.id, {
      location: { x: newX, y: el.location?.y || 0 },
    })
  }

  historyStore.push({
    description: 'Align right',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: pos.x, y: el.location?.y || 0 },
          })
        }
      }
    },
    redo: () => alignRight(),
  })
}

function alignTop() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const minY = Math.min(...elements.map(el => el.location?.y || 0))
  const oldPositions = elements.map(el => ({ id: el.id, y: el.location?.y || 0 }))

  for (const el of elements) {
    elementsStore.updateElement(el.id, {
      location: { x: el.location?.x || 0, y: minY },
    })
  }

  historyStore.push({
    description: 'Align top',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: el.location?.x || 0, y: pos.y },
          })
        }
      }
    },
    redo: () => alignTop(),
  })
}

function alignMiddle() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const middles = elements.map(el => (el.location?.y || 0) + (el.size?.cy || 50) / 2)
  const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length
  const oldPositions = elements.map(el => ({ id: el.id, y: el.location?.y || 0 }))

  for (const el of elements) {
    const newY = avgMiddle - (el.size?.cy || 50) / 2
    elementsStore.updateElement(el.id, {
      location: { x: el.location?.x || 0, y: newY },
    })
  }

  historyStore.push({
    description: 'Align middle',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: el.location?.x || 0, y: pos.y },
          })
        }
      }
    },
    redo: () => alignMiddle(),
  })
}

function alignBottom() {
  const elements = getSelectedElements()
  if (elements.length < 2) return

  const maxBottom = Math.max(
    ...elements.map(el => (el.location?.y || 0) + (el.size?.cy || 50))
  )
  const oldPositions = elements.map(el => ({ id: el.id, y: el.location?.y || 0 }))

  for (const el of elements) {
    const newY = maxBottom - (el.size?.cy || 50)
    elementsStore.updateElement(el.id, {
      location: { x: el.location?.x || 0, y: newY },
    })
  }

  historyStore.push({
    description: 'Align bottom',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: el.location?.x || 0, y: pos.y },
          })
        }
      }
    },
    redo: () => alignBottom(),
  })
}

function distributeHorizontally() {
  const elements = getSelectedElements()
  if (elements.length < 3) return

  // Sort by x position
  const sorted = [...elements].sort((a, b) => (a.location?.x || 0) - (b.location?.x || 0))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const totalWidth = (last.location?.x || 0) + (last.size?.cx || 100) - (first.location?.x || 0)
  const elementsWidth = sorted.reduce((sum, el) => sum + (el.size?.cx || 100), 0)
  const gap = (totalWidth - elementsWidth) / (sorted.length - 1)

  const oldPositions = elements.map(el => ({ id: el.id, x: el.location?.x || 0 }))
  let currentX = first.location?.x || 0

  for (const el of sorted) {
    elementsStore.updateElement(el.id, {
      location: { x: currentX, y: el.location?.y || 0 },
    })
    currentX += (el.size?.cx || 100) + gap
  }

  historyStore.push({
    description: 'Distribute horizontally',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: pos.x, y: el.location?.y || 0 },
          })
        }
      }
    },
    redo: () => distributeHorizontally(),
  })
}

function distributeVertically() {
  const elements = getSelectedElements()
  if (elements.length < 3) return

  const sorted = [...elements].sort((a, b) => (a.location?.y || 0) - (b.location?.y || 0))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const totalHeight = (last.location?.y || 0) + (last.size?.cy || 50) - (first.location?.y || 0)
  const elementsHeight = sorted.reduce((sum, el) => sum + (el.size?.cy || 50), 0)
  const gap = (totalHeight - elementsHeight) / (sorted.length - 1)

  const oldPositions = elements.map(el => ({ id: el.id, y: el.location?.y || 0 }))
  let currentY = first.location?.y || 0

  for (const el of sorted) {
    elementsStore.updateElement(el.id, {
      location: { x: el.location?.x || 0, y: currentY },
    })
    currentY += (el.size?.cy || 50) + gap
  }

  historyStore.push({
    description: 'Distribute vertically',
    undo: () => {
      for (const pos of oldPositions) {
        const el = elementsStore.getElementById(pos.id)
        if (el) {
          elementsStore.updateElement(pos.id, {
            location: { x: el.location?.x || 0, y: pos.y },
          })
        }
      }
    },
    redo: () => distributeVertically(),
  })
}
</script>

<template>
  <div v-if="hasMultipleSelection || hasSingleSelection" class="alignment-toolbar">
    <div class="toolbar-section">
      <span class="section-label">Align</span>
      <div class="button-group">
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align left"
          @click="alignLeft"
        >
          <span class="icon">&#x25C4;</span>
        </button>
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align center"
          @click="alignCenter"
        >
          <span class="icon">&#x2503;</span>
        </button>
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align right"
          @click="alignRight"
        >
          <span class="icon">&#x25BA;</span>
        </button>
        <span class="separator" />
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align top"
          @click="alignTop"
        >
          <span class="icon">&#x25B2;</span>
        </button>
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align middle"
          @click="alignMiddle"
        >
          <span class="icon">&#x2501;</span>
        </button>
        <button
          class="tool-btn"
          :disabled="!hasMultipleSelection"
          title="Align bottom"
          @click="alignBottom"
        >
          <span class="icon">&#x25BC;</span>
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <span class="section-label">Distribute</span>
      <div class="button-group">
        <button
          class="tool-btn"
          :disabled="selectionStore.selectedIds.length < 3"
          title="Distribute horizontally"
          @click="distributeHorizontally"
        >
          <span class="icon">&#x2194;</span>
        </button>
        <button
          class="tool-btn"
          :disabled="selectionStore.selectedIds.length < 3"
          title="Distribute vertically"
          @click="distributeVertically"
        >
          <span class="icon">&#x2195;</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alignment-toolbar {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.button-group {
  display: flex;
  gap: 2px;
}

.tool-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.tool-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--accent-primary);
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon {
  font-size: 10px;
}

.separator {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 var(--spacing-xs);
}
</style>
