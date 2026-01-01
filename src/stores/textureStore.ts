/**
 * Texture Store
 *
 * Pinia store for managing loaded textures
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TextureManager, type TextureData } from '@/core/texture/TextureManager'

export const useTextureStore = defineStore('textures', () => {
  // State
  const loadedTextures = ref<Map<string, TextureData>>(new Map())
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // Getters
  const textureCount = computed(() => loadedTextures.value.size)

  const textureNames = computed(() => Array.from(loadedTextures.value.keys()))

  const textureList = computed(() => Array.from(loadedTextures.value.values()))

  // Actions
  async function loadTexture(file: File): Promise<TextureData | null> {
    isLoading.value = true
    loadError.value = null

    try {
      const texture = await TextureManager.loadFromFile(file)
      loadedTextures.value.set(texture.name, texture)
      return texture
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load texture'
      console.error('Texture load error:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function loadTextures(files: File[]): Promise<void> {
    for (const file of files) {
      // Only load image files
      if (file.type.startsWith('image/') || file.name.endsWith('.tga')) {
        await loadTexture(file)
      }
    }
  }

  function getTexture(name: string): TextureData | undefined {
    return loadedTextures.value.get(name) || TextureManager.get(name)
  }

  function hasTexture(name: string): boolean {
    return loadedTextures.value.has(name) || TextureManager.has(name)
  }

  function removeTexture(name: string): void {
    loadedTextures.value.delete(name)
    TextureManager.remove(name)
  }

  function clear(): void {
    loadedTextures.value.clear()
    TextureManager.clear()
  }

  return {
    // State
    loadedTextures,
    isLoading,
    loadError,

    // Getters
    textureCount,
    textureNames,
    textureList,

    // Actions
    loadTexture,
    loadTextures,
    getTexture,
    hasTexture,
    removeTexture,
    clear,
  }
})
