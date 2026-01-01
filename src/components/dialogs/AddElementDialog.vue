<script setup lang="ts">
import { ref, computed } from 'vue'
import { useElementsStore } from '@/stores/elementsStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useHistoryStore } from '@/stores/historyStore'
import {
  createScreen,
  createButton,
  createGauge,
  createLabel,
} from '@/models/elements/Controls'
import { createDefaultScreenPiece } from '@/models/elements/ScreenPiece'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const elementsStore = useElementsStore()
const selectionStore = useSelectionStore()
const historyStore = useHistoryStore()

const screenId = ref('')
const selectedType = ref('Button')

const elementTypes = [
  { type: 'Screen', label: 'Screen (Window)', icon: '\u25A2', description: 'Top-level window container' },
  { type: 'Button', label: 'Button', icon: '\u25C9', description: 'Clickable button control' },
  { type: 'Gauge', label: 'Gauge', icon: '\u25AC', description: 'Progress bar (HP, Mana, etc.)' },
  { type: 'Label', label: 'Label', icon: 'A', description: 'Static or dynamic text' },
  { type: 'Editbox', label: 'Editbox', icon: '\u270E', description: 'Text input field' },
  { type: 'Listbox', label: 'Listbox', icon: '\u2630', description: 'List/table view' },
  { type: 'StaticAnimation', label: 'Static Animation', icon: '\u25B6', description: 'Animated image element' },
]

const selectedTypeInfo = computed(() =>
  elementTypes.find(t => t.type === selectedType.value)
)

function handleSubmit() {
  if (!screenId.value.trim()) {
    alert('Please enter a Screen ID')
    return
  }

  // Create the element based on type
  let element
  switch (selectedType.value) {
    case 'Screen':
      element = createScreen(screenId.value)
      break
    case 'Button':
      element = createButton(screenId.value)
      break
    case 'Gauge':
      element = createGauge(screenId.value)
      break
    case 'Label':
      element = createLabel(screenId.value)
      break
    default:
      element = createDefaultScreenPiece(selectedType.value, screenId.value)
  }

  // Position near center of viewport
  element.location = { x: 100, y: 100 }

  // If we have a selected parent element (Screen), add as child
  const selectedParent = selectionStore.singleSelection
  if (selectedParent && selectedType.value !== 'Screen') {
    element.parentId = selectedParent.id
    // Position relative to parent
    element.location = { x: 10, y: 30 }
  }

  // Add to store
  elementsStore.addElement(element)

  // Record in history
  historyStore.push({
    description: `Add ${selectedType.value}`,
    undo: () => elementsStore.deleteElement(element.id),
    redo: () => elementsStore.addElement(element),
  })

  // Select the new element
  selectionStore.select(element.id)

  // Reset and close
  screenId.value = ''
  emit('close')
}

function handleCancel() {
  screenId.value = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
      <div class="dialog">
        <div class="dialog-header">
          <h2>Add Element</h2>
          <button class="close-btn" @click="handleCancel">&times;</button>
        </div>

        <div class="dialog-content">
          <div class="form-group">
            <label>Element Type</label>
            <div class="type-grid">
              <button
                v-for="type in elementTypes"
                :key="type.type"
                class="type-option"
                :class="{ selected: selectedType === type.type }"
                @click="selectedType = type.type"
              >
                <span class="type-icon">{{ type.icon }}</span>
                <span class="type-label">{{ type.label }}</span>
              </button>
            </div>
            <p v-if="selectedTypeInfo" class="type-description">
              {{ selectedTypeInfo.description }}
            </p>
          </div>

          <div class="form-group">
            <label for="screenId">Screen ID</label>
            <input
              id="screenId"
              v-model="screenId"
              type="text"
              class="input"
              placeholder="e.g., MyButton, HPGauge"
              @keydown.enter="handleSubmit"
            />
            <p class="hint">Unique identifier for this element</p>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn" @click="handleCancel">Cancel</button>
          <button class="btn btn-primary" @click="handleSubmit">Add Element</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
}

.dialog {
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.dialog-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 20px;
  font-family: inherit;
  color: var(--text-muted);
  background: none;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.dialog-content {
  padding: var(--spacing-md);
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group .input {
  width: 100%;
}

.hint {
  margin: var(--spacing-xs) 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xs);
}

.type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm);
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.15s;
}

.type-option:hover {
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.type-option.selected {
  border-color: var(--accent-primary);
  background: rgba(124, 58, 237, 0.15);
  color: var(--text-primary);
}

.type-icon {
  font-size: 20px;
  color: var(--accent-primary);
}

.type-label {
  font-size: 11px;
}

.type-description {
  margin: var(--spacing-sm) 0 0;
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}
</style>
