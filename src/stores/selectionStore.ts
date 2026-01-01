/**
 * Selection Store
 *
 * Manages selection state for the editor
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useElementsStore } from './elementsStore'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'

export const useSelectionStore = defineStore('selection', () => {
  const elementsStore = useElementsStore()

  // State
  const selectedIds = ref<Set<string>>(new Set())
  const hoveredId = ref<string | null>(null)
  const focusedPropertyPath = ref<string | null>(null)

  // Getters
  const selectedElements = computed((): ScreenPiece[] => {
    return [...selectedIds.value]
      .map((id) => elementsStore.getElementById(id))
      .filter((el): el is ScreenPiece => el !== undefined)
  })

  const singleSelection = computed((): ScreenPiece | null => {
    if (selectedIds.value.size !== 1) return null
    const [id] = selectedIds.value
    return elementsStore.getElementById(id) || null
  })

  const hasSelection = computed(() => selectedIds.value.size > 0)

  const selectionCount = computed(() => selectedIds.value.size)

  const hoveredElement = computed((): ScreenPiece | null => {
    if (!hoveredId.value) return null
    return elementsStore.getElementById(hoveredId.value) || null
  })

  // Actions
  // Note: Vue's reactivity doesn't reliably track Set mutations (.add, .delete, .clear)
  // so we must create a new Set and reassign the ref to trigger reactivity

  function select(id: string, multi = false): void {
    const newSet = new Set(selectedIds.value)
    if (multi) {
      // Toggle selection for multi-select
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
    } else {
      // Single select - clear and add
      newSet.clear()
      newSet.add(id)
    }
    selectedIds.value = newSet
  }

  function selectMultiple(ids: string[]): void {
    const newSet = new Set<string>()
    for (const id of ids) {
      newSet.add(id)
    }
    selectedIds.value = newSet
  }

  function addToSelection(id: string): void {
    const newSet = new Set(selectedIds.value)
    newSet.add(id)
    selectedIds.value = newSet
  }

  function removeFromSelection(id: string): void {
    const newSet = new Set(selectedIds.value)
    newSet.delete(id)
    selectedIds.value = newSet
  }

  function selectAll(): void {
    const newSet = new Set<string>()
    for (const element of elementsStore.elementList) {
      newSet.add(element.id)
    }
    selectedIds.value = newSet
  }

  function clearSelection(): void {
    selectedIds.value = new Set()
    focusedPropertyPath.value = null
  }

  function setHovered(id: string | null): void {
    hoveredId.value = id
  }

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function setFocusedProperty(path: string | null): void {
    focusedPropertyPath.value = path
  }

  /**
   * Select parent of currently selected element
   */
  function selectParent(): void {
    const current = singleSelection.value
    if (current?.parentId) {
      select(current.parentId)
    }
  }

  /**
   * Select first child of currently selected element
   */
  function selectFirstChild(): void {
    const current = singleSelection.value
    if (current?.children.length) {
      select(current.children[0].id)
    }
  }

  return {
    // State
    selectedIds,
    hoveredId,
    focusedPropertyPath,

    // Getters
    selectedElements,
    singleSelection,
    hasSelection,
    selectionCount,
    hoveredElement,

    // Actions
    select,
    selectMultiple,
    addToSelection,
    removeFromSelection,
    selectAll,
    clearSelection,
    setHovered,
    isSelected,
    setFocusedProperty,
    selectParent,
    selectFirstChild,
  }
})
