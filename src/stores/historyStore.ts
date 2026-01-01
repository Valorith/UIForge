/**
 * History Store
 *
 * Manages undo/redo history
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/** A single history entry */
export interface HistoryEntry {
  id: string
  timestamp: number
  description: string
  undo: () => void
  redo: () => void
}

export const useHistoryStore = defineStore('history', () => {
  // State
  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])
  const maxHistorySize = 100
  const isExecuting = ref(false) // Prevent recursive history pushes

  // Getters
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const undoDescription = computed(() => undoStack.value.at(-1)?.description)
  const redoDescription = computed(() => redoStack.value.at(-1)?.description)
  const historyLength = computed(() => undoStack.value.length)

  // Actions
  function push(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    // Don't record history while undoing/redoing
    if (isExecuting.value) return

    const fullEntry: HistoryEntry = {
      ...entry,
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }

    undoStack.value.push(fullEntry)

    // Trim if too long
    if (undoStack.value.length > maxHistorySize) {
      undoStack.value.shift()
    }

    // Clear redo stack on new action
    redoStack.value = []
  }

  function undo(): void {
    const entry = undoStack.value.pop()
    if (!entry) return

    isExecuting.value = true
    try {
      entry.undo()
      redoStack.value.push(entry)
    } finally {
      isExecuting.value = false
    }
  }

  function redo(): void {
    const entry = redoStack.value.pop()
    if (!entry) return

    isExecuting.value = true
    try {
      entry.redo()
      undoStack.value.push(entry)
    } finally {
      isExecuting.value = false
    }
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
  }

  /**
   * Create a reversible action helper
   */
  function createAction<T>(
    description: string,
    doAction: () => T,
    undoAction: (result: T) => void
  ): T {
    const result = doAction()

    push({
      description,
      undo: () => undoAction(result),
      redo: () => doAction(),
    })

    return result
  }

  /**
   * Helper for property changes
   */
  function recordPropertyChange<T>(
    description: string,
    target: { [key: string]: unknown },
    property: string,
    oldValue: T,
    newValue: T
  ): void {
    push({
      description,
      undo: () => {
        target[property] = oldValue
      },
      redo: () => {
        target[property] = newValue
      },
    })
  }

  return {
    // State
    undoStack,
    redoStack,
    isExecuting,

    // Getters
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    historyLength,

    // Actions
    push,
    undo,
    redo,
    clear,
    createAction,
    recordPropertyChange,
  }
})
