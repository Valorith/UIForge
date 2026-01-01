<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTextureStore } from '@/stores/textureStore'
import type { TextureData } from '@/core/texture/TextureManager'

const textureStore = useTextureStore()
const fileInputRef = ref<HTMLInputElement>()
const selectedTexture = ref<string | null>(null)
const previewTexture = ref<TextureData | null>(null)

const textures = computed(() => textureStore.textureList)
const isLoading = computed(() => textureStore.isLoading)
const error = computed(() => textureStore.loadError)

function handleLoadTextures() {
  fileInputRef.value?.click()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  await textureStore.loadTextures(Array.from(files))
  input.value = ''
}

function selectTexture(texture: TextureData) {
  selectedTexture.value = texture.name
  previewTexture.value = texture
}

function removeTexture(name: string) {
  textureStore.removeTexture(name)
  if (selectedTexture.value === name) {
    selectedTexture.value = null
    previewTexture.value = null
  }
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (!files?.length) return

  const imageFiles = Array.from(files).filter(
    f => f.type.startsWith('image/') || f.name.endsWith('.tga')
  )
  if (imageFiles.length) {
    await textureStore.loadTextures(imageFiles)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}
</script>

<template>
  <div class="texture-panel" @drop="handleDrop" @dragover="handleDragOver">
    <input
      ref="fileInputRef"
      type="file"
      accept=".tga,.png,.jpg,.jpeg,.gif,.bmp"
      multiple
      style="display: none"
      @change="onFilesSelected"
    />

    <div class="panel-header">
      <h3>Textures</h3>
      <button class="btn btn-sm" @click="handleLoadTextures" title="Load textures">
        +
      </button>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="textures.length === 0" class="empty-state">
      <p>No textures loaded</p>
      <p class="hint">Drag &amp; drop image files here or click + to load</p>
    </div>

    <div v-else class="texture-list">
      <div
        v-for="texture in textures"
        :key="texture.name"
        class="texture-item"
        :class="{ selected: selectedTexture === texture.name }"
        @click="selectTexture(texture)"
      >
        <div class="texture-thumb">
          <img :src="texture.canvas.toDataURL()" :alt="texture.name" />
        </div>
        <div class="texture-info">
          <span class="texture-name">{{ texture.name }}</span>
          <span class="texture-size">{{ texture.width }}x{{ texture.height }}</span>
        </div>
        <button
          class="remove-btn"
          @click.stop="removeTexture(texture.name)"
          title="Remove texture"
        >
          &times;
        </button>
      </div>
    </div>

    <div v-if="previewTexture" class="texture-preview">
      <div class="preview-header">
        <span>{{ previewTexture.name }}</span>
        <span class="preview-dims">{{ previewTexture.width }} x {{ previewTexture.height }}</span>
      </div>
      <div class="preview-image">
        <img :src="previewTexture.canvas.toDataURL()" :alt="previewTexture.name" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.texture-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-sm {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}

.loading,
.error {
  padding: var(--spacing-md);
  font-size: var(--font-size-sm);
  text-align: center;
}

.error {
  color: var(--error-color);
}

.empty-state {
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--text-muted);
}

.empty-state p {
  margin: 0;
}

.empty-state .hint {
  margin-top: var(--spacing-sm);
  font-size: 11px;
}

.texture-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xs);
}

.texture-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.15s;
}

.texture-item:hover {
  background: var(--bg-hover);
}

.texture-item.selected {
  background: var(--bg-active);
}

.texture-thumb {
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius);
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.texture-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.texture-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.texture-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.texture-size {
  font-size: 10px;
  color: var(--text-muted);
}

.remove-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 14px;
  color: var(--text-muted);
  background: none;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.texture-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--bg-tertiary);
  color: var(--error-color);
}

.texture-preview {
  border-top: 1px solid var(--border-color);
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.preview-dims {
  color: var(--text-muted);
  font-size: 11px;
}

.preview-image {
  background: repeating-conic-gradient(
    var(--bg-primary) 0% 25%,
    var(--bg-secondary) 0% 50%
  ) 50% / 16px 16px;
  border-radius: var(--border-radius);
  overflow: hidden;
  max-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  image-rendering: pixelated;
}
</style>
