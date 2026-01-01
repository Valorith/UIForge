/**
 * Project structure types
 */

import type { Screen } from '../elements/Controls'
import type { TemplateLibrary } from '../elements/Templates'

/** A single UI file (EQUI_*.xml) */
export interface UIFile {
  filename: string // e.g., "EQUI_Inventory.xml"
  screens: Screen[]
  isDirty: boolean // Has unsaved changes
  originalXml?: string // For preserving comments/formatting
}

/** Complete UI project */
export interface UIProject {
  name: string
  version: string
  files: UIFile[]
  templates: TemplateLibrary
  basePath?: string // Directory path if loaded from folder
}

/** Project metadata for save/load */
export interface ProjectMetadata {
  name: string
  version: string
  createdAt: string
  modifiedAt: string
  fileCount: number
}

/** Create an empty project */
export function createProject(name = 'Untitled Project'): UIProject {
  return {
    name,
    version: '1.0.0',
    files: [],
    templates: {
      textures: new Map(),
      animations: new Map(),
      frameTemplates: new Map(),
      buttonTemplates: new Map(),
      gaugeTemplates: new Map(),
      sliderTemplates: new Map(),
      scrollbarTemplates: new Map(),
      windowTemplates: new Map(),
    },
  }
}

/** Create a new UI file */
export function createUIFile(filename: string): UIFile {
  return {
    filename,
    screens: [],
    isDirty: false,
  }
}

/** Get project metadata */
export function getProjectMetadata(project: UIProject): ProjectMetadata {
  return {
    name: project.name,
    version: project.version,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    fileCount: project.files.length,
  }
}

/** Check if project has unsaved changes */
export function hasUnsavedChanges(project: UIProject): boolean {
  return project.files.some((file) => file.isDirty)
}

/** Mark file as dirty (has changes) */
export function markFileDirty(project: UIProject, filename: string): void {
  const file = project.files.find((f) => f.filename === filename)
  if (file) {
    file.isDirty = true
  }
}

/** Mark file as clean (saved) */
export function markFileClean(project: UIProject, filename: string): void {
  const file = project.files.find((f) => f.filename === filename)
  if (file) {
    file.isDirty = false
  }
}

/** Standard EQ UI files that are commonly edited */
export const COMMON_EQUI_FILES = [
  'EQUI_Inventory.xml',
  'EQUI_SpellBookWnd.xml',
  'EQUI_CastSpellWnd.xml',
  'EQUI_BuffWindow.xml',
  'EQUI_TargetWindow.xml',
  'EQUI_PlayerWindow.xml',
  'EQUI_GroupWindow.xml',
  'EQUI_HotButtonWnd.xml',
  'EQUI_BankWnd.xml',
  'EQUI_MerchantWnd.xml',
  'EQUI_LootWnd.xml',
  'EQUI_TradeWnd.xml',
  'EQUI_MapViewWnd.xml',
  'EQUI_ChatWindow.xml',
  'EQUI_PetInfoWindow.xml',
  'EQUI_AAWindow.xml',
  'EQUI_SkillsWindow.xml',
  'EQUI_CombatAbilityWnd.xml',
  'EQUI_CompassWindow.xml',
  'EQUI_OptionsWindow.xml',
]
