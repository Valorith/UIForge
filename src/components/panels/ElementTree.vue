<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementsStore } from '@/stores/elementsStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useProjectStore } from '@/stores/projectStore'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'

const elementsStore = useElementsStore()
const selectionStore = useSelectionStore()
const projectStore = useProjectStore()

// Track expanded nodes
const expandedNodes = ref<Set<string>>(new Set())

const rootElements = computed(() => elementsStore.mainRoots)
const hasElements = computed(() => elementsStore.elementCount > 0)

// Get icon for element type
function getTypeIcon(type: string): string {
  switch (type) {
    case 'Screen': return '&#9634;' // Box
    case 'Button': return '&#9673;' // Circle bullet
    case 'Gauge': return '&#9644;' // Rectangle
    case 'Label': return 'A'
    case 'Editbox': return '&#9998;' // Pencil
    case 'Listbox': return '&#9776;' // Menu
    case 'Slider': return '&#8596;' // Arrow
    case 'TabBox': return '&#9701;' // Tab
    default: return '&#9632;' // Square
  }
}

// Handle node click
function handleNodeClick(element: ScreenPiece, event: MouseEvent) {
  selectionStore.select(element.id, event.ctrlKey || event.metaKey || event.shiftKey)
}

// Handle expand/collapse
function toggleExpand(element: ScreenPiece, event: MouseEvent) {
  event.stopPropagation()
  if (expandedNodes.value.has(element.id)) {
    expandedNodes.value.delete(element.id)
  } else {
    expandedNodes.value.add(element.id)
  }
}

// Check if node is expanded
function isExpanded(id: string): boolean {
  return expandedNodes.value.has(id)
}

// Expand all nodes
function expandAll() {
  const addAll = (elements: ScreenPiece[]) => {
    for (const el of elements) {
      if (el.children.length > 0) {
        expandedNodes.value.add(el.id)
        addAll(el.children)
      }
    }
  }
  addAll(rootElements.value)
}

// Collapse all nodes
function collapseAll() {
  expandedNodes.value.clear()
}

// Handle double click to rename (future feature)
function handleDoubleClick(element: ScreenPiece) {
  // Could open rename dialog
  console.log('Double clicked:', element.screenId)
}
</script>

<template>
  <div class="element-tree">
    <div class="panel-header">
      <span>Elements</span>
      <div class="header-actions" v-if="hasElements">
        <button class="btn-icon" @click="expandAll" title="Expand All">+</button>
        <button class="btn-icon" @click="collapseAll" title="Collapse All">-</button>
      </div>
    </div>

    <div class="file-selector" v-if="projectStore.fileNames.length > 0">
      <select
        class="file-select"
        :value="projectStore.activeFileName"
        @change="(e) => projectStore.setActiveFile((e.target as HTMLSelectElement).value)"
      >
        <option
          v-for="filename in projectStore.fileNames"
          :key="filename"
          :value="filename"
        >
          {{ filename }}
        </option>
      </select>
      <span class="file-count">{{ projectStore.fileNames.length }} file(s)</span>
    </div>

    <div class="panel-content">
      <div v-if="!hasElements" class="empty-state">
        <p>No UI loaded</p>
        <p class="text-muted">Use File &gt; Open to load EQUI files</p>
        <p class="text-muted">or press Ctrl+O</p>
      </div>

      <div v-else class="tree-container">
        <template v-for="element in rootElements" :key="element.id">
          <TreeNode
            :element="element"
            :depth="0"
            :expanded="isExpanded(element.id)"
            :selected="selectionStore.isSelected(element.id)"
            :hovered="selectionStore.hoveredId === element.id"
            @click="handleNodeClick"
            @toggle="toggleExpand"
            @dblclick="handleDoubleClick"
            @mouseenter="selectionStore.setHovered(element.id)"
            @mouseleave="selectionStore.setHovered(null)"
          >
            <template v-if="element.children.length > 0 && isExpanded(element.id)">
              <TreeNodeRecursive
                v-for="child in element.children"
                :key="child.id"
                :element="child"
                :depth="1"
                :expandedNodes="expandedNodes"
                :selectionStore="selectionStore"
                @click="handleNodeClick"
                @toggle="toggleExpand"
              />
            </template>
          </TreeNode>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// TreeNode component (inline for simplicity)
import { defineComponent, h, type PropType } from 'vue'

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    element: { type: Object as PropType<ScreenPiece>, required: true },
    depth: { type: Number, default: 0 },
    expanded: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    hovered: { type: Boolean, default: false },
  },
  emits: ['click', 'toggle', 'dblclick', 'mouseenter', 'mouseleave'],
  setup(props, { emit, slots }) {
    const getTypeIcon = (type: string): string => {
      switch (type) {
        // Container types
        case 'Screen': return '\u25A2'
        case 'TileLayoutBox': return '\u229E'
        case 'LayoutBox': return '\u25A2'
        case 'VerticalLayoutBox': return '\u25A1'
        case 'HorizontalLayoutBox': return '\u25A1'
        case 'Page': return '\u2630'
        case 'TabBox': return '\u2630'
        case 'StaticGroup': return '\u25A2'
        case 'StaticScreen': return '\u25A2'
        case 'Grid': return '\u229E'
        case 'Layout': return '\u25A4'
        case 'Holder': return '\u25A2'
        // Control types
        case 'Button': return '\u25C9'
        case 'Gauge': return '\u25AC'
        case 'Label': return 'A'
        case 'Editbox': return '\u270E'
        case 'Listbox': return '\u2630'
        case 'Combobox': return '\u25BE'
        case 'Slider': return '\u2194'
        case 'STMLbox': return '\u2261'
        case 'RadioGroup': return '\u25C9'
        case 'Header': return 'H'
        case 'Choices': return '\u2630'
        // EQ-specific types
        case 'InvSlot': return '\u25A3'
        case 'SpellGem': return '\u25C6'
        case 'HotButton': return '\u2318'
        // Static types
        case 'StaticAnimation': return '\u25B6'
        case 'StaticText': return 'T'
        case 'StaticFrame': return '\u25AD'
        // Other
        case 'Browser': return '\u2602'
        case 'TreeView': return '\u26B2'
        default: return '\u25A0'
      }
    }

    return () => h('div', { class: 'tree-node-wrapper' }, [
      h('div', {
        class: ['tree-node', {
          selected: props.selected,
          hovered: props.hovered,
        }],
        style: { paddingLeft: `${props.depth * 16 + 8}px` },
        onClick: (e: MouseEvent) => emit('click', props.element, e),
        onDblclick: () => emit('dblclick', props.element),
        onMouseenter: () => emit('mouseenter'),
        onMouseleave: () => emit('mouseleave'),
      }, [
        // Expand/collapse button
        props.element.children.length > 0
          ? h('span', {
              class: ['expand-btn', { expanded: props.expanded }],
              onClick: (e: MouseEvent) => emit('toggle', props.element, e),
            }, props.expanded ? '▼' : '▶')
          : h('span', { class: 'expand-spacer' }, ''),

        // Type icon
        h('span', { class: 'type-icon' }, getTypeIcon(props.element.type)),

        // Label
        h('span', { class: 'node-label' }, props.element.screenId),

        // Type badge
        h('span', { class: 'type-badge' }, props.element.type),
      ]),

      // Children slot
      slots.default?.(),
    ])
  },
})

// Recursive version
const TreeNodeRecursive = defineComponent({
  name: 'TreeNodeRecursive',
  props: {
    element: { type: Object as PropType<ScreenPiece>, required: true },
    depth: { type: Number, default: 0 },
    expandedNodes: { type: Object as PropType<Set<string>>, required: true },
    selectionStore: { type: Object, required: true },
  },
  emits: ['click', 'toggle'],
  setup(props, { emit }) {
    const isExpanded = (id: string) => props.expandedNodes.has(id)

    return () => h(TreeNode, {
      element: props.element,
      depth: props.depth,
      expanded: isExpanded(props.element.id),
      selected: props.selectionStore.isSelected(props.element.id),
      hovered: props.selectionStore.hoveredId === props.element.id,
      onClick: (el: ScreenPiece, e: MouseEvent) => emit('click', el, e),
      onToggle: (el: ScreenPiece, e: MouseEvent) => emit('toggle', el, e),
      onMouseenter: () => props.selectionStore.setHovered(props.element.id),
      onMouseleave: () => props.selectionStore.setHovered(null),
    }, {
      default: () => props.element.children.length > 0 && isExpanded(props.element.id)
        ? props.element.children.map((child: ScreenPiece) =>
            h(TreeNodeRecursive, {
              key: child.id,
              element: child,
              depth: props.depth + 1,
              expandedNodes: props.expandedNodes,
              selectionStore: props.selectionStore,
              onClick: (el: ScreenPiece, e: MouseEvent) => emit('click', el, e),
              onToggle: (el: ScreenPiece, e: MouseEvent) => emit('toggle', el, e),
            })
          )
        : null,
    })
  },
})

export { TreeNode, TreeNodeRecursive }
</script>

<style scoped>
.element-tree {
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

.header-actions {
  display: flex;
  gap: 2px;
}

.btn-icon {
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  font-family: inherit;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  cursor: pointer;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.file-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.file-select {
  flex: 1;
  min-width: 0;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  cursor: pointer;
  outline: none;
}

.file-select:hover {
  border-color: var(--accent-primary);
}

.file-select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
}

.file-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.file-count {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
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

.tree-container {
  padding: var(--spacing-xs) 0;
  overflow-x: hidden;
}

.tree-node-wrapper {
  /* Container for node and its children */
}

.tree-node {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 4px 8px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  user-select: none;
  min-height: 26px;
  transition: background 0.1s;
}

.tree-node * {
  cursor: inherit;
  user-select: none;
}

.tree-node:hover,
.tree-node.hovered {
  background: var(--bg-tertiary);
}

.tree-node.selected {
  background: var(--accent-primary);
  color: white;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 8px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.1s;
}

.expand-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.expand-spacer {
  width: 16px;
  height: 16px;
}

.type-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--accent-primary);
}

.tree-node.selected .type-icon {
  color: white;
}

.node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.type-badge {
  flex-shrink: 0;
  padding: 2px 6px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  background: var(--bg-primary);
  border-radius: 3px;
}

.tree-node.selected .type-badge {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.tree-node:hover .type-badge {
  background: var(--bg-secondary);
}
</style>
