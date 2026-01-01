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
  function select(id: string, multi = false): void {
    if (multi) {
      // Toggle selection for multi-select
      if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id)
      } else {
        selectedIds.value.add(id)
      }
    } else {
      // Single select - clear and add
      selectedIds.value.clear()
      selectedIds.value.add(id)
    }
  }

  function selectMultiple(ids: string[]): void {
    selectedIds.value.clear()
    for (const id of ids) {
      selectedIds.value.add(id)
    }
  }

  function addToSelection(id: string): void {
    selectedIds.value.add(id)
  }

  function removeFromSelection(id: string): void {
    selectedIds.value.delete(id)
  }

  function selectAll(): void {
    for (const element of elementsStore.elementList) {
      selectedIds.value.add(element.id)
    }
  }

  function clearSelection(): void {
    selectedIds.value.clear()
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
