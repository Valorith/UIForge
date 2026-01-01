<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSelectionStore } from '@/stores/selectionStore'
import { useElementsStore } from '@/stores/elementsStore'
import { useHistoryStore } from '@/stores/historyStore'
import { rgbToHex, hexToRGB } from '@/models/base/Primitives'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'

const selectionStore = useSelectionStore()
const elementsStore = useElementsStore()
const historyStore = useHistoryStore()

const selectedElement = computed(() => selectionStore.singleSelection)
const multipleSelected = computed(() => selectionStore.selectionCount > 1)

// Collapsed sections
const collapsedSections = ref<Set<string>>(new Set())

function toggleSection(section: string) {
  if (collapsedSections.value.has(section)) {
    collapsedSections.value.delete(section)
  } else {
    collapsedSections.value.add(section)
  }
}

function isSectionOpen(section: string): boolean {
  return !collapsedSections.value.has(section)
}

// Update property with history
function updateProperty<K extends keyof ScreenPiece>(
  property: K,
  newValue: ScreenPiece[K],
  description?: string
) {
  const element = selectedElement.value
  if (!element) return

  const oldValue = element[property]

  elementsStore.updateElement(element.id, { [property]: newValue })

  historyStore.push({
    description: description || `Change ${String(property)}`,
    undo: () => elementsStore.updateElement(element.id, { [property]: oldValue }),
    redo: () => elementsStore.updateElement(element.id, { [property]: newValue }),
  })
}

// Update nested property (like location.x)
function updateNestedProperty(
  parent: 'location' | 'size',
  property: string,
  value: number
) {
  const element = selectedElement.value
  if (!element) return

  const oldValue = { ...element[parent] }
  const newValue = { ...element[parent], [property]: value }

  elementsStore.updateElement(element.id, { [parent]: newValue })

  historyStore.push({
    description: `Change ${parent}.${property}`,
    undo: () => elementsStore.updateElement(element.id, { [parent]: oldValue }),
    redo: () => elementsStore.updateElement(element.id, { [parent]: newValue }),
  })
}

// Update text color
function updateTextColor(hexColor: string) {
  const element = selectedElement.value
  if (!element) return

  const oldValue = element.textColor
  const newValue = hexToRGB(hexColor)

  elementsStore.updateElement(element.id, { textColor: newValue })

  historyStore.push({
    description: 'Change text color',
    undo: () => elementsStore.updateElement(element.id, { textColor: oldValue }),
    redo: () => elementsStore.updateElement(element.id, { textColor: newValue }),
  })
}

// Update style flag
function updateStyleFlag(flag: keyof ScreenPiece['style'], value: boolean) {
  const element = selectedElement.value
  if (!element) return

  const oldStyle = { ...element.style }
  const newStyle = { ...element.style, [flag]: value }

  elementsStore.updateElement(element.id, { style: newStyle })

  historyStore.push({
    description: `Toggle ${String(flag)}`,
    undo: () => elementsStore.updateElement(element.id, { style: oldStyle }),
    redo: () => elementsStore.updateElement(element.id, { style: newStyle }),
  })
}

// Get text color as hex
const textColorHex = computed(() => {
  if (!selectedElement.value?.textColor) return '#ffffff'
  return rgbToHex(selectedElement.value.textColor)
})

// Style flags list
const styleFlags = [
  { key: 'transparent', label: 'Transparent' },
  { key: 'border', label: 'Border' },
  { key: 'titlebar', label: 'Titlebar' },
  { key: 'closebox', label: 'Close Box' },
  { key: 'minimizebox', label: 'Minimize Box' },
  { key: 'sizable', label: 'Sizable' },
  { key: 'vScroll', label: 'V-Scroll' },
  { key: 'hScroll', label: 'H-Scroll' },
] as const
</script>

<template>
  <div class="property-inspector">
    <div class="panel-header">
      <span>Properties</span>
    </div>

    <div class="panel-content">
      <!-- No selection -->
      <div v-if="!selectedElement && !multipleSelected" class="empty-state">
        <p>No element selected</p>
        <p class="text-muted">Select an element to edit its properties</p>
      </div>

      <!-- Multiple selection -->
      <div v-else-if="multipleSelected" class="empty-state">
        <p>{{ selectionStore.selectionCount }} elements selected</p>
        <p class="text-muted">Select a single element to edit properties</p>
      </div>

      <!-- Single element selected -->
      <template v-else-if="selectedElement">
        <!-- Identity Section -->
        <div class="property-section">
          <div class="section-header" @click="toggleSection('identity')">
            <span class="section-toggle">{{ isSectionOpen('identity') ? '▼' : '▶' }}</span>
            <span>Identity</span>
          </div>
          <div v-if="isSectionOpen('identity')" class="section-content">
            <div class="property-row">
              <label>Type</label>
              <span class="property-value readonly">{{ selectedElement.type }}</span>
            </div>
            <div class="property-row">
              <label>Screen ID</label>
              <input
                type="text"
                class="input"
                :value="selectedElement.screenId"
                @change="(e) => updateProperty('screenId', (e.target as HTMLInputElement).value)"
              />
            </div>
            <div class="property-row" v-if="selectedElement.item">
              <label>Item</label>
              <span class="property-value readonly">{{ selectedElement.item }}</span>
            </div>
          </div>
        </div>

        <!-- Position Section -->
        <div class="property-section">
          <div class="section-header" @click="toggleSection('position')">
            <span class="section-toggle">{{ isSectionOpen('position') ? '▼' : '▶' }}</span>
            <span>Position</span>
          </div>
          <div v-if="isSectionOpen('position')" class="section-content">
            <div class="property-row">
              <label>X</label>
              <input
                type="number"
                class="input input-number"
                :value="selectedElement.location.x"
                @change="(e) => updateNestedProperty('location', 'x', parseInt((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="property-row">
              <label>Y</label>
              <input
                type="number"
                class="input input-number"
                :value="selectedElement.location.y"
                @change="(e) => updateNestedProperty('location', 'y', parseInt((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="property-row">
              <label>Width</label>
              <input
                type="number"
                class="input input-number"
                :value="selectedElement.size.cx"
                @change="(e) => updateNestedProperty('size', 'cx', parseInt((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="property-row">
              <label>Height</label>
              <input
                type="number"
                class="input input-number"
                :value="selectedElement.size.cy"
                @change="(e) => updateNestedProperty('size', 'cy', parseInt((e.target as HTMLInputElement).value) || 0)"
              />
            </div>
            <div class="property-row">
              <label>Auto Stretch</label>
              <input
                type="checkbox"
                :checked="selectedElement.autoStretch"
                @change="(e) => updateProperty('autoStretch', (e.target as HTMLInputElement).checked)"
              />
            </div>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="property-section">
          <div class="section-header" @click="toggleSection('appearance')">
            <span class="section-toggle">{{ isSectionOpen('appearance') ? '▼' : '▶' }}</span>
            <span>Appearance</span>
          </div>
          <div v-if="isSectionOpen('appearance')" class="section-content">
            <div class="property-row">
              <label>Text</label>
              <input
                type="text"
                class="input"
                :value="selectedElement.text || ''"
                @change="(e) => updateProperty('text', (e.target as HTMLInputElement).value || undefined)"
              />
            </div>
            <div class="property-row">
              <label>Font</label>
              <select
                class="input"
                :value="selectedElement.font || 2"
                @change="(e) => updateProperty('font', parseInt((e.target as HTMLSelectElement).value))"
              >
                <option :value="0">0 - Smallest</option>
                <option :value="1">1 - Small</option>
                <option :value="2">2 - Normal</option>
                <option :value="3">3 - Medium</option>
                <option :value="4">4 - Large</option>
                <option :value="5">5 - Larger</option>
                <option :value="6">6 - Largest</option>
              </select>
            </div>
            <div class="property-row">
              <label>Text Color</label>
              <div class="color-picker">
                <input
                  type="color"
                  :value="textColorHex"
                  @change="(e) => updateTextColor((e.target as HTMLInputElement).value)"
                />
                <span class="color-hex">{{ textColorHex }}</span>
              </div>
            </div>
            <div class="property-row" v-if="selectedElement.drawTemplate">
              <label>Template</label>
              <span class="property-value readonly">{{ selectedElement.drawTemplate }}</span>
            </div>
          </div>
        </div>

        <!-- Style Section -->
        <div class="property-section">
          <div class="section-header" @click="toggleSection('style')">
            <span class="section-toggle">{{ isSectionOpen('style') ? '▼' : '▶' }}</span>
            <span>Style Flags</span>
          </div>
          <div v-if="isSectionOpen('style')" class="section-content">
            <div
              v-for="flag in styleFlags"
              :key="flag.key"
              class="property-row checkbox-row"
            >
              <label>
                <input
                  type="checkbox"
                  :checked="selectedElement.style[flag.key] || false"
                  @change="(e) => updateStyleFlag(flag.key, (e.target as HTMLInputElement).checked)"
                />
                {{ flag.label }}
              </label>
            </div>
          </div>
        </div>

        <!-- Type-specific Section -->
        <div class="property-section" v-if="'eqType' in selectedElement">
          <div class="section-header" @click="toggleSection('eqtype')">
            <span class="section-toggle">{{ isSectionOpen('eqtype') ? '▼' : '▶' }}</span>
            <span>EQ Binding</span>
          </div>
          <div v-if="isSectionOpen('eqtype')" class="section-content">
            <div class="property-row">
              <label>EQType</label>
              <span class="property-value readonly">{{ (selectedElement as any).eqType }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.property-inspector {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color);
}

.panel-content {
  flex: 1;
  overflow: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: var(--spacing-md);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.empty-state p {
  margin: var(--spacing-xs) 0;
}

.property-section {
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: var(--bg-tertiary);
}

.section-toggle {
  width: 12px;
  font-size: 8px;
  color: var(--text-muted);
}

.section-content {
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-sm);
}

.property-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.property-row label {
  width: 80px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.property-row .input {
  flex: 1;
  min-width: 0;
}

.input-number {
  width: 80px;
  flex: 0 0 auto;
}

.property-value {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.property-value.readonly {
  color: var(--text-muted);
  font-style: italic;
}

.checkbox-row {
  margin-bottom: var(--spacing-xs);
}

.checkbox-row label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  width: auto;
  cursor: pointer;
}

.checkbox-row input[type="checkbox"] {
  margin: 0;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.color-picker input[type="color"] {
  width: 32px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
}

.color-hex {
  font-size: var(--font-size-sm);
  font-family: var(--font-mono);
  color: var(--text-muted);
}
</style>
