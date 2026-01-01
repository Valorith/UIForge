/**
 * Project Store
 *
 * Manages the current project state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UIProject, UIFile } from '@/models/project/Project'
import { createProject, hasUnsavedChanges } from '@/models/project/Project'
import { parseEquiFile, resolvePiecesReferences, isManifestFile, type ParsedEquiFile } from '@/core/parser/EquiParser'
import { serializeUIFile } from '@/core/parser/XmlSerializer'
import { useElementsStore } from './elementsStore'
import { useSelectionStore } from './selectionStore'

export const useProjectStore = defineStore('project', () => {
  const elementsStore = useElementsStore()
  const selectionStore = useSelectionStore()

  // State
  const project = ref<UIProject>(createProject())
  const activeFileName = ref<string | null>(null)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  // Getters
  const activeFile = computed((): UIFile | null => {
    if (!activeFileName.value) return null
    return project.value.files.find((f) => f.filename === activeFileName.value) || null
  })

  const isDirty = computed(() => hasUnsavedChanges(project.value))

  const fileNames = computed(() => project.value.files.map((f) => f.filename))

  const projectName = computed(() => project.value.name)

  // Actions
  function setProjectName(name: string): void {
    project.value.name = name
  }

  function setActiveFile(filename: string | null): void {
    activeFileName.value = filename

    // Clear selection when switching files
    selectionStore.clearSelection()

    // Load elements from the active file into the elements store
    if (filename) {
      const file = project.value.files.find((f) => f.filename === filename)
      if (file) {
        elementsStore.clear()
        for (const screen of file.screens) {
          elementsStore.loadElementTree(screen)
        }
      }
    } else {
      elementsStore.clear()
    }
  }

  async function loadFile(file: File): Promise<void> {
    isLoading.value = true
    loadError.value = null

    try {
      const content = await file.text()
      const parsed = parseEquiFile(content, file.name)

      if (parsed.errors.length > 0) {
        console.warn('Parse warnings:', parsed.errors)
      }

      // Resolve internal references for this file
      resolvePiecesReferences([parsed])

      // Create UIFile
      const uiFile: UIFile = {
        filename: file.name,
        screens: parsed.screens,
        isDirty: false,
        originalXml: content,
      }

      // Add or replace file in project
      const existingIndex = project.value.files.findIndex((f) => f.filename === file.name)
      if (existingIndex >= 0) {
        project.value.files[existingIndex] = uiFile
      } else {
        project.value.files.push(uiFile)
      }

      // Merge templates
      for (const [key, value] of parsed.templates.textures) {
        project.value.templates.textures.set(key, value)
      }
      for (const [key, value] of parsed.templates.animations) {
        project.value.templates.animations.set(key, value)
      }
      for (const [key, value] of parsed.templates.frameTemplates) {
        project.value.templates.frameTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.buttonTemplates) {
        project.value.templates.buttonTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.gaugeTemplates) {
        project.value.templates.gaugeTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.windowTemplates) {
        project.value.templates.windowTemplates.set(key, value)
      }

      // Set as active file
      setActiveFile(file.name)
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load file'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function loadFiles(files: File[]): Promise<void> {
    // Build a map of all files by name for manifest resolution
    const fileMap = new Map<string, File>()
    for (const file of files) {
      fileMap.set(file.name, file)
    }

    // Track all parsed files for Pieces resolution
    const allParsed: ParsedEquiFile[] = []

    // Check for manifest files first (e.g., EQUI.xml)
    const manifestFile = files.find(f => f.name === 'EQUI.xml' || f.name.toLowerCase() === 'equi.xml')
    let orderedFiles = files

    if (manifestFile) {
      const content = await manifestFile.text()
      const parsed = parseEquiFile(content, manifestFile.name)

      if (isManifestFile(parsed) && parsed.includes) {
        // Load files in the order specified by the manifest
        orderedFiles = []
        for (const includeName of parsed.includes) {
          const file = fileMap.get(includeName)
          if (file) {
            orderedFiles.push(file)
          } else {
            console.warn(`Manifest references file not found: ${includeName}`)
          }
        }
        // Add any remaining files not in manifest
        for (const file of files) {
          if (!orderedFiles.includes(file) && file !== manifestFile) {
            orderedFiles.push(file)
          }
        }
      }
    }

    // Load all files and collect parsed results
    for (const file of orderedFiles) {
      const content = await file.text()
      const parsed = parseEquiFile(content, file.name)

      // Skip manifest-only files
      if (isManifestFile(parsed)) {
        continue
      }

      if (parsed.errors.length > 0) {
        console.warn(`Parse warnings for ${file.name}:`, parsed.errors)
      }

      allParsed.push(parsed)

      // Create UIFile
      const uiFile: UIFile = {
        filename: file.name,
        screens: parsed.screens,
        isDirty: false,
        originalXml: content,
      }

      // Add or replace file in project
      const existingIndex = project.value.files.findIndex((f) => f.filename === file.name)
      if (existingIndex >= 0) {
        project.value.files[existingIndex] = uiFile
      } else {
        project.value.files.push(uiFile)
      }

      // Merge templates
      for (const [key, value] of parsed.templates.textures) {
        project.value.templates.textures.set(key, value)
      }
      for (const [key, value] of parsed.templates.animations) {
        project.value.templates.animations.set(key, value)
      }
      for (const [key, value] of parsed.templates.frameTemplates) {
        project.value.templates.frameTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.buttonTemplates) {
        project.value.templates.buttonTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.gaugeTemplates) {
        project.value.templates.gaugeTemplates.set(key, value)
      }
      for (const [key, value] of parsed.templates.windowTemplates) {
        project.value.templates.windowTemplates.set(key, value)
      }
    }

    // Resolve Pieces references across all files
    if (allParsed.length > 0) {
      resolvePiecesReferences(allParsed)

      // Update the project files with resolved references
      for (const parsed of allParsed) {
        const uiFile = project.value.files.find(f => f.filename === parsed.filename)
        if (uiFile) {
          uiFile.screens = parsed.screens
        }
      }
    }

    // Set the first file with screens as active
    const firstWithScreens = project.value.files.find(f => f.screens.length > 0)
    if (firstWithScreens) {
      setActiveFile(firstWithScreens.filename)
    }
  }

  function exportActiveFile(): string | null {
    const file = activeFile.value
    if (!file) return null
    return serializeUIFile(file)
  }

  function markFileDirty(filename: string): void {
    const file = project.value.files.find((f) => f.filename === filename)
    if (file) {
      file.isDirty = true
    }
  }

  function markFileClean(filename: string): void {
    const file = project.value.files.find((f) => f.filename === filename)
    if (file) {
      file.isDirty = false
    }
  }

  function removeFile(filename: string): void {
    const index = project.value.files.findIndex((f) => f.filename === filename)
    if (index >= 0) {
      project.value.files.splice(index, 1)

      // If removed file was active, switch to another or clear
      if (activeFileName.value === filename) {
        setActiveFile(project.value.files[0]?.filename || null)
      }
    }
  }

  function newProject(name = 'Untitled Project'): void {
    project.value = createProject(name)
    activeFileName.value = null
    elementsStore.clear()
  }

  function reset(): void {
    newProject()
    loadError.value = null
  }

  return {
    // State
    project,
    activeFileName,
    isLoading,
    loadError,

    // Getters
    activeFile,
    isDirty,
    fileNames,
    projectName,

    // Actions
    setProjectName,
    setActiveFile,
    loadFile,
    loadFiles,
    exportActiveFile,
    markFileDirty,
    markFileClean,
    removeFile,
    newProject,
    reset,
  }
})
