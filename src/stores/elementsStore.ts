/**
 * Elements Store
 *
 * Central state management for all UI elements
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'
import { cloneScreenPiece, generateId } from '@/models/elements/ScreenPiece'

export const useElementsStore = defineStore('elements', () => {
  // State - flat map for O(1) lookup
  const elements = ref<Map<string, ScreenPiece>>(new Map())

  // Getters
  const rootElements = computed(() => {
    return [...elements.value.values()].filter((el) => !el.parentId)
  })

  const elementCount = computed(() => elements.value.size)

  const elementList = computed(() => [...elements.value.values()])

  // Actions
  function addElement(element: ScreenPiece): void {
    elements.value.set(element.id, element)

    // Also add to parent's children if it has a parent
    if (element.parentId) {
      const parent = elements.value.get(element.parentId)
      if (parent && !parent.children.find((c) => c.id === element.id)) {
        parent.children.push(element)
      }
    }
  }

  function addElements(newElements: ScreenPiece[]): void {
    for (const element of newElements) {
      addElement(element)
    }
  }

  function updateElement(id: string, changes: Partial<ScreenPiece>): void {
    const element = elements.value.get(id)
    if (element) {
      Object.assign(element, changes)
    }
  }

  function deleteElement(id: string): void {
    const element = elements.value.get(id)
    if (!element) return

    // Remove from parent's children
    if (element.parentId) {
      const parent = elements.value.get(element.parentId)
      if (parent) {
        parent.children = parent.children.filter((c) => c.id !== id)
      }
    }

    // Recursively delete children
    for (const child of element.children) {
      deleteElement(child.id)
    }

    // Remove from map
    elements.value.delete(id)
  }

  function moveElement(id: string, newParentId: string | null): void {
    const element = elements.value.get(id)
    if (!element) return

    // Remove from old parent
    if (element.parentId) {
      const oldParent = elements.value.get(element.parentId)
      if (oldParent) {
        oldParent.children = oldParent.children.filter((c) => c.id !== id)
      }
    }

    // Add to new parent
    element.parentId = newParentId || undefined
    if (newParentId) {
      const newParent = elements.value.get(newParentId)
      if (newParent) {
        newParent.children.push(element)
      }
    }
  }

  function duplicateElement(id: string): ScreenPiece | null {
    const element = elements.value.get(id)
    if (!element) return null

    const clone = cloneScreenPiece(element)
    clone.screenId = `${element.screenId}_copy`

    // Offset position slightly
    clone.location = {
      x: element.location.x + 20,
      y: element.location.y + 20,
    }

    addElement(clone)
    return clone
  }

  function getElementById(id: string): ScreenPiece | undefined {
    return elements.value.get(id)
  }

  function getElementsByType(type: string): ScreenPiece[] {
    return [...elements.value.values()].filter((el) => el.type === type)
  }

  function getChildren(parentId: string): ScreenPiece[] {
    const parent = elements.value.get(parentId)
    return parent?.children || []
  }

  function clear(): void {
    elements.value = new Map()
  }

  /**
   * Flatten a hierarchical element tree into the store
   */
  function loadElementTree(rootElement: ScreenPiece): void {
    const flatten = (element: ScreenPiece): void => {
      elements.value.set(element.id, element)
      for (const child of element.children) {
        child.parentId = element.id
        flatten(child)
      }
    }
    flatten(rootElement)
  }

  return {
    // State
    elements,

    // Getters
    rootElements,
    elementCount,
    elementList,

    // Actions
    addElement,
    addElements,
    updateElement,
    deleteElement,
    moveElement,
    duplicateElement,
    getElementById,
    getElementsByType,
    getChildren,
    clear,
    loadElementTree,
  }
})
