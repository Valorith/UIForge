/**
 * SIDL.xml Parser
 *
 * Parses the SUITE Interface Definition Language schema file that defines
 * all valid element types, properties, and inheritance relationships.
 */

/** Property definition from SIDL */
export interface PropertyDefinition {
  name: string
  type: string // integer, string, boolean, or ElementType reference
  defaultValue?: string | number | boolean
  minOccurs?: number // 0 = optional
  maxOccurs?: number | '*' // * = unlimited
  isReference?: boolean // True if type refers to another ElementType
}

/** ElementType definition from SIDL */
export interface ElementTypeDefinition {
  name: string
  superType?: string // Parent type for inheritance
  properties: PropertyDefinition[]
  description?: string
}

/** Parsed SIDL schema */
export interface SidlSchema {
  elementTypes: Map<string, ElementTypeDefinition>
  inheritanceMap: Map<string, string> // child -> parent
}

/**
 * Parse SIDL.xml content into a schema object
 */
export function parseSidl(xmlContent: string): SidlSchema {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'text/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`)
  }

  const schema: SidlSchema = {
    elementTypes: new Map(),
    inheritanceMap: new Map(),
  }

  // Find all ElementType definitions
  const elementTypes = doc.querySelectorAll('ElementType')

  for (const elementType of elementTypes) {
    const definition = parseElementType(elementType)
    schema.elementTypes.set(definition.name, definition)

    // Track inheritance
    if (definition.superType) {
      schema.inheritanceMap.set(definition.name, definition.superType)
    }
  }

  return schema
}

/**
 * Parse a single ElementType node
 */
function parseElementType(node: Element): ElementTypeDefinition {
  const name = node.getAttribute('name') || 'Unknown'

  // Check for superType (inheritance)
  const superTypeNode = node.querySelector(':scope > superType')
  const superType = superTypeNode?.textContent?.trim()

  // Parse all element (property) definitions
  const properties: PropertyDefinition[] = []
  const elementNodes = node.querySelectorAll(':scope > element')

  for (const elementNode of elementNodes) {
    const prop = parseProperty(elementNode)
    if (prop) {
      properties.push(prop)
    }
  }

  return {
    name,
    superType,
    properties,
  }
}

/**
 * Parse a property (element) definition
 */
function parseProperty(node: Element): PropertyDefinition | null {
  const name = node.getAttribute('name')
  const type = node.getAttribute('type')

  if (!name || !type) {
    return null
  }

  // Parse occurrence constraints
  const minOccurs = node.getAttribute('minOccurs')
  const maxOccurs = node.getAttribute('maxOccurs')

  // Check if this is a reference to another ElementType
  const isReference = type.includes(':item') || type.startsWith(':')

  // Parse default value if present
  const defaultNode = node.querySelector('default')
  let defaultValue: string | number | boolean | undefined
  if (defaultNode) {
    const defaultText = defaultNode.textContent?.trim()
    if (defaultText !== undefined) {
      if (type === 'integer') {
        defaultValue = parseInt(defaultText, 10)
      } else if (type === 'boolean') {
        defaultValue = defaultText.toLowerCase() === 'true'
      } else {
        defaultValue = defaultText
      }
    }
  }

  return {
    name,
    type: type.replace(':item', ''), // Remove :item suffix
    minOccurs: minOccurs ? parseInt(minOccurs, 10) : undefined,
    maxOccurs: maxOccurs === '*' ? '*' : maxOccurs ? parseInt(maxOccurs, 10) : undefined,
    isReference,
    defaultValue,
  }
}

/**
 * Get all inherited properties for an element type
 */
export function getInheritedProperties(
  schema: SidlSchema,
  typeName: string
): PropertyDefinition[] {
  const properties: PropertyDefinition[] = []
  let currentType = typeName

  // Walk up the inheritance chain
  while (currentType) {
    const definition = schema.elementTypes.get(currentType)
    if (definition) {
      // Add properties from this type (in reverse order to maintain hierarchy)
      properties.unshift(...definition.properties)
      currentType = definition.superType || ''
    } else {
      break
    }
  }

  return properties
}

/**
 * Check if a type inherits from another type
 */
export function inheritsFrom(
  schema: SidlSchema,
  typeName: string,
  parentTypeName: string
): boolean {
  let currentType = typeName

  while (currentType) {
    if (currentType === parentTypeName) {
      return true
    }
    currentType = schema.inheritanceMap.get(currentType) || ''
  }

  return false
}

/**
 * Get all types that inherit from a given type
 */
export function getDescendantTypes(
  schema: SidlSchema,
  parentTypeName: string
): string[] {
  const descendants: string[] = []

  for (const [typeName] of schema.elementTypes) {
    if (typeName !== parentTypeName && inheritsFrom(schema, typeName, parentTypeName)) {
      descendants.push(typeName)
    }
  }

  return descendants
}

/**
 * Get the default values for an element type
 */
export function getDefaultValues(
  schema: SidlSchema,
  typeName: string
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  const properties = getInheritedProperties(schema, typeName)

  for (const prop of properties) {
    if (prop.defaultValue !== undefined) {
      defaults[prop.name] = prop.defaultValue
    }
  }

  return defaults
}

/**
 * Built-in SIDL types that don't need to be parsed
 */
export const BUILTIN_TYPES = [
  'integer',
  'string',
  'boolean',
  'Class',
  'RGB',
  'Point',
  'Size',
]

/**
 * Core element types we expect to find
 */
export const CORE_ELEMENT_TYPES = [
  'ScreenPiece',
  'Screen',
  'Control',
  'Button',
  'Gauge',
  'Label',
  'Editbox',
  'Listbox',
  'Slider',
  'TabBox',
  'STMLbox',
  'Combobox',
  'InvSlot',
  'SpellGem',
  'StaticScreenPiece',
  'StaticAnimation',
  'StaticText',
]
