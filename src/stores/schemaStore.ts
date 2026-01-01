/**
 * Schema Store
 *
 * Manages the SIDL schema data
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SidlSchema, ElementTypeDefinition, PropertyDefinition } from '@/core/parser/SidlParser'
import { parseSidl, getInheritedProperties, getDefaultValues } from '@/core/parser/SidlParser'

export const useSchemaStore = defineStore('schema', () => {
  // State
  const schema = ref<SidlSchema | null>(null)
  const isLoaded = ref(false)
  const loadError = ref<string | null>(null)

  // Getters
  const elementTypes = computed(() => {
    if (!schema.value) return []
    return Array.from(schema.value.elementTypes.keys())
  })

  const controlTypes = computed(() => {
    if (!schema.value) return []
    // Filter to types that inherit from Control or ScreenPiece
    return elementTypes.value.filter((name) => {
      const def = schema.value?.elementTypes.get(name)
      return def?.superType === 'Control' || def?.superType === 'ScreenPiece'
    })
  })

  // Actions
  async function loadSchema(xmlContent: string): Promise<void> {
    try {
      loadError.value = null
      schema.value = parseSidl(xmlContent)
      isLoaded.value = true
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to parse schema'
      throw err
    }
  }

  function getElementType(name: string): ElementTypeDefinition | undefined {
    return schema.value?.elementTypes.get(name)
  }

  function getProperties(typeName: string): PropertyDefinition[] {
    if (!schema.value) return []
    return getInheritedProperties(schema.value, typeName)
  }

  function getDefaults(typeName: string): Record<string, unknown> {
    if (!schema.value) return {}
    return getDefaultValues(schema.value, typeName)
  }

  function reset(): void {
    schema.value = null
    isLoaded.value = false
    loadError.value = null
  }

  return {
    // State
    schema,
    isLoaded,
    loadError,

    // Getters
    elementTypes,
    controlTypes,

    // Actions
    loadSchema,
    getElementType,
    getProperties,
    getDefaults,
    reset,
  }
})
