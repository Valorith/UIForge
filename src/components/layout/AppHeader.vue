<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useSelectionStore } from '@/stores/selectionStore'
import { useElementsStore } from '@/stores/elementsStore'
import type { ScreenPiece } from '@/models/elements/ScreenPiece'
import AddElementDialog from '@/components/dialogs/AddElementDialog.vue'

const projectStore = useProjectStore()
const historyStore = useHistoryStore()
const selectionStore = useSelectionStore()
const elementsStore = useElementsStore()

const fileInputRef = ref<HTMLInputElement>()
const folderInputRef = ref<HTMLInputElement>()
const activeMenu = ref<string | null>(null)
const showAddElementDialog = ref(false)
const clipboard = ref<ScreenPiece | null>(null)

const projectName = computed(() => {
  const name = projectStore.projectName
  const dirty = projectStore.isDirty ? ' *' : ''
  return name + dirty
})

interface MenuItem {
  label: string
  action?: () => void
  disabled?: boolean
  separator?: boolean
}

interface Menu {
  label: string
  items: MenuItem[]
}

const menuItems = computed<Menu[]>(() => [
  {
    label: 'File',
    items: [
      { label: 'New Project', action: handleNewProject },
      { label: 'Open Files...', action: handleOpenFiles },
      { label: 'Open Folder...', action: handleOpenFolder },
      { label: 'Close Folder', action: handleCloseFolder, disabled: projectStore.fileNames.length === 0 },
      { separator: true, label: '' },
      { label: 'Export...', action: handleExport, disabled: !projectStore.activeFile },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: `Undo${historyStore.undoDescription ? ` "${historyStore.undoDescription}"` : ''}`, action: handleUndo, disabled: !historyStore.canUndo },
      { label: `Redo${historyStore.redoDescription ? ` "${historyStore.redoDescription}"` : ''}`, action: handleRedo, disabled: !historyStore.canRedo },
      { separator: true, label: '' },
      { label: 'Cut', action: handleCut, disabled: !selectionStore.hasSelection },
      { label: 'Copy', action: handleCopy, disabled: !selectionStore.hasSelection },
      { label: 'Paste', action: handlePaste, disabled: !clipboard.value },
      { label: 'Duplicate', action: handleDuplicate, disabled: !selectionStore.hasSelection },
      { separator: true, label: '' },
      { label: 'Delete', action: handleDelete, disabled: !selectionStore.hasSelection },
      { label: 'Select All', action: handleSelectAll },
      { separator: true, label: '' },
      { label: 'Add Element...', action: handleAddElement },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Zoom In', action: () => emit('zoom', 0.25) },
      { label: 'Zoom Out', action: () => emit('zoom', -0.25) },
      { label: 'Reset Zoom', action: () => emit('zoom', 0) },
    ],
  },
])

const emit = defineEmits<{
  zoom: [delta: number]
}>()

function toggleMenu(label: string) {
  activeMenu.value = activeMenu.value === label ? null : label
}

function closeMenu() {
  activeMenu.value = null
}

function handleMenuItemClick(item: MenuItem) {
  if (item.disabled || !item.action) return
  item.action()
  closeMenu()
}

function handleNewProject() {
  if (projectStore.isDirty) {
    if (!confirm('You have unsaved changes. Create a new project anyway?')) {
      return
    }
  }
  projectStore.newProject()
}

function handleOpenFiles() {
  fileInputRef.value?.click()
}

async function handleOpenFolder() {
  // Try modern File System Access API first
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker()
      const files: File[] = []

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.xml')) {
          const file = await entry.getFile()
          files.push(file)
        }
      }

      if (files.length === 0) {
        alert('No XML files found in the selected folder.')
        return
      }

      // Clear existing project and load new files
      projectStore.newProject(dirHandle.name)
      await projectStore.loadFiles(files)
    } catch (err: any) {
      // User cancelled or error
      if (err.name !== 'AbortError') {
        console.error('Failed to open folder:', err)
        alert('Failed to open folder. Try using "Open Files..." instead.')
      }
    }
  } else {
    // Fallback for browsers without File System Access API
    folderInputRef.value?.click()
  }
}

function handleCloseFolder() {
  if (projectStore.isDirty) {
    if (!confirm('You have unsaved changes. Close anyway?')) {
      return
    }
  }
  projectStore.newProject()
}

async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  try {
    await projectStore.loadFiles(Array.from(files))
  } catch (err) {
    console.error('Failed to load files:', err)
    alert('Failed to load one or more files. Check the console for details.')
  }

  // Reset input so same file can be selected again
  input.value = ''
}

async function onFolderSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  // Filter for XML files only
  const xmlFiles = Array.from(files).filter(f => f.name.endsWith('.xml'))

  if (xmlFiles.length === 0) {
    alert('No XML files found in the selected folder.')
    input.value = ''
    return
  }

  try {
    // Get folder name from first file's path
    const firstFile = xmlFiles[0]
    const pathParts = firstFile.webkitRelativePath.split('/')
    const folderName = pathParts[0] || 'Imported Folder'

    projectStore.newProject(folderName)
    await projectStore.loadFiles(xmlFiles)
  } catch (err) {
    console.error('Failed to load folder:', err)
    alert('Failed to load one or more files. Check the console for details.')
  }

  input.value = ''
}

function handleExport() {
  const xml = projectStore.exportActiveFile()
  if (!xml) return

  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = projectStore.activeFileName || 'export.xml'
  a.click()
  URL.revokeObjectURL(url)
}

function handleUndo() {
  historyStore.undo()
}

function handleRedo() {
  historyStore.redo()
}

function handleDelete() {
  for (const id of selectionStore.selectedIds) {
    elementsStore.deleteElement(id)
  }
  selectionStore.clearSelection()
}

function handleSelectAll() {
  selectionStore.selectAll()
}

function handleCut() {
  if (!selectionStore.singleSelection) return
  clipboard.value = JSON.parse(JSON.stringify(selectionStore.singleSelection))
  const element = selectionStore.singleSelection
  elementsStore.deleteElement(element.id)
  historyStore.push({
    description: `Cut ${element.type}`,
    undo: () => elementsStore.addElement(element),
    redo: () => elementsStore.deleteElement(element.id),
  })
  selectionStore.clearSelection()
}

function handleCopy() {
  if (!selectionStore.singleSelection) return
  clipboard.value = JSON.parse(JSON.stringify(selectionStore.singleSelection))
}

function handlePaste() {
  if (!clipboard.value) return

  // Create a deep copy with a new ID
  const newElement: ScreenPiece = JSON.parse(JSON.stringify(clipboard.value))
  newElement.id = `${newElement.type}_${Date.now()}`
  newElement.screenId = `${clipboard.value.screenId}_copy`

  // Offset position slightly so it's visible
  newElement.location = {
    x: (clipboard.value.location?.x || 0) + 20,
    y: (clipboard.value.location?.y || 0) + 20,
  }

  elementsStore.addElement(newElement)
  historyStore.push({
    description: `Paste ${newElement.type}`,
    undo: () => elementsStore.deleteElement(newElement.id),
    redo: () => elementsStore.addElement(newElement),
  })
  selectionStore.select(newElement.id)
}

function handleDuplicate() {
  if (!selectionStore.singleSelection) return
  const original = selectionStore.singleSelection

  const newElement: ScreenPiece = JSON.parse(JSON.stringify(original))
  newElement.id = `${newElement.type}_${Date.now()}`
  newElement.screenId = `${original.screenId}_copy`
  newElement.location = {
    x: (original.location?.x || 0) + 20,
    y: (original.location?.y || 0) + 20,
  }

  elementsStore.addElement(newElement)
  historyStore.push({
    description: `Duplicate ${newElement.type}`,
    undo: () => elementsStore.deleteElement(newElement.id),
    redo: () => elementsStore.addElement(newElement),
  })
  selectionStore.select(newElement.id)
}

function handleAddElement() {
  showAddElementDialog.value = true
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  const isMod = event.ctrlKey || event.metaKey

  if (isMod && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  } else if (isMod && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault()
    handleRedo()
  } else if (isMod && event.key === 'a') {
    event.preventDefault()
    handleSelectAll()
  } else if (isMod && event.key === 'x') {
    event.preventDefault()
    handleCut()
  } else if (isMod && event.key === 'c') {
    event.preventDefault()
    handleCopy()
  } else if (isMod && event.key === 'v') {
    event.preventDefault()
    handlePaste()
  } else if (isMod && event.key === 'd') {
    event.preventDefault()
    handleDuplicate()
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectionStore.hasSelection) {
      event.preventDefault()
      handleDelete()
    }
  } else if (isMod && event.key === 'o') {
    event.preventDefault()
    handleOpenFiles()
  }
}

// Register global keyboard handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<template>
  <header class="app-header">
    <input
      ref="fileInputRef"
      type="file"
      accept=".xml"
      multiple
      style="display: none"
      @change="onFilesSelected"
    />
    <input
      ref="folderInputRef"
      type="file"
      webkitdirectory
      style="display: none"
      @change="onFolderSelected"
    />

    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">&#9878;</span>
        <span class="logo-text">UIForge</span>
      </div>
      <nav class="menu-bar" @mouseleave="closeMenu">
        <div
          v-for="menu in menuItems"
          :key="menu.label"
          class="menu-item"
          :class="{ active: activeMenu === menu.label }"
          @click="toggleMenu(menu.label)"
          @mouseenter="activeMenu && toggleMenu(menu.label)"
        >
          <span class="menu-label">{{ menu.label }}</span>
          <div v-if="activeMenu === menu.label" class="menu-dropdown">
            <template v-for="item in menu.items" :key="item.label">
              <div v-if="item.separator" class="menu-separator" />
              <button
                v-else
                class="menu-dropdown-item"
                :class="{ disabled: item.disabled }"
                @click.stop="handleMenuItemClick(item)"
              >
                {{ item.label }}
              </button>
            </template>
          </div>
        </div>
      </nav>
    </div>
    <div class="header-center">
      <span class="project-name">{{ projectName }}</span>
    </div>
    <div class="header-right">
      <button class="btn" title="Help">?</button>
    </div>

    <AddElementDialog
      :visible="showAddElementDialog"
      @close="showAddElementDialog = false"
    />
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 var(--spacing-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
}

.logo-icon {
  font-size: 20px;
  color: var(--accent-primary);
}

.logo-text {
  font-size: var(--font-size-lg);
}

.menu-bar {
  display: flex;
  gap: 2px;
}

.menu-item {
  position: relative;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  border-radius: var(--border-radius);
  cursor: pointer;
}

.menu-item:hover,
.menu-item.active {
  background: var(--bg-tertiary);
}

.menu-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 200px;
  padding: var(--spacing-xs) 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.menu-dropdown-item {
  display: block;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-family: inherit;
  color: var(--text-primary);
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.menu-dropdown-item:hover:not(.disabled) {
  background: var(--bg-hover);
}

.menu-dropdown-item.disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.menu-separator {
  height: 1px;
  margin: var(--spacing-xs) 0;
  background: var(--border-color);
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.project-name {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-right {
  display: flex;
  gap: var(--spacing-sm);
}
</style>
