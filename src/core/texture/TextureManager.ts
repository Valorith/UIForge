/**
 * TextureManager
 *
 * Handles loading, caching, and managing texture files.
 * Supports TGA, PNG, JPG, and other common image formats.
 */

import type { Size, Point } from '@/models/base/Primitives'

/**
 * Custom TGA decoder for EverQuest texture files
 * Handles uncompressed and RLE-compressed TGA formats
 */
function decodeTgaCustom(data: Uint8Array): { width: number; height: number; data: Uint8ClampedArray } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  // TGA Header (18 bytes)
  const idLength = data[0]
  const colorMapType = data[1]
  const imageType = data[2]
  // Color map spec (5 bytes) - skip for now
  // const colorMapOrigin = view.getUint16(3, true)
  // const colorMapLength = view.getUint16(5, true)
  // const colorMapDepth = data[7]
  // Image spec
  // const xOrigin = view.getUint16(8, true)
  // const yOrigin = view.getUint16(10, true)
  const width = view.getUint16(12, true)
  const height = view.getUint16(14, true)
  const bitsPerPixel = data[16]
  const imageDescriptor = data[17]

  const bytesPerPixel = bitsPerPixel / 8
  const hasAlpha = (imageDescriptor & 0x0F) > 0 || bitsPerPixel === 32
  const topToBottom = (imageDescriptor & 0x20) !== 0

  console.log('TGA Header:', {
    width, height, bitsPerPixel, imageType,
    colorMapType, idLength, hasAlpha, topToBottom
  })

  if (width === 0 || height === 0) {
    throw new Error(`Invalid TGA dimensions: ${width}x${height}`)
  }

  // Skip header and ID field
  let offset = 18 + idLength

  // Skip color map if present
  if (colorMapType === 1) {
    const colorMapLength = view.getUint16(5, true)
    const colorMapDepth = data[7]
    offset += colorMapLength * (colorMapDepth / 8)
  }

  const pixels = new Uint8ClampedArray(width * height * 4)

  // Image type: 2 = uncompressed true-color, 10 = RLE true-color
  // Image type: 3 = uncompressed grayscale, 11 = RLE grayscale
  if (imageType === 2 || imageType === 3) {
    // Uncompressed
    for (let i = 0; i < width * height; i++) {
      const pixelOffset = i * 4

      if (imageType === 3) {
        // Grayscale
        const gray = data[offset++]
        pixels[pixelOffset] = gray
        pixels[pixelOffset + 1] = gray
        pixels[pixelOffset + 2] = gray
        pixels[pixelOffset + 3] = 255
      } else if (bytesPerPixel === 3) {
        // BGR
        pixels[pixelOffset + 2] = data[offset++] // B -> R
        pixels[pixelOffset + 1] = data[offset++] // G -> G
        pixels[pixelOffset] = data[offset++]     // R -> B
        pixels[pixelOffset + 3] = 255
      } else if (bytesPerPixel === 4) {
        // BGRA
        pixels[pixelOffset + 2] = data[offset++] // B
        pixels[pixelOffset + 1] = data[offset++] // G
        pixels[pixelOffset] = data[offset++]     // R
        pixels[pixelOffset + 3] = data[offset++] // A
      }
    }
  } else if (imageType === 10 || imageType === 11) {
    // RLE compressed
    let pixelIndex = 0
    while (pixelIndex < width * height) {
      const packet = data[offset++]
      const count = (packet & 0x7F) + 1
      const isRLE = (packet & 0x80) !== 0

      if (isRLE) {
        // RLE packet - one pixel repeated
        let b = 0, g = 0, r = 0, a = 255
        if (imageType === 11) {
          const gray = data[offset++]
          r = g = b = gray
        } else if (bytesPerPixel === 3) {
          b = data[offset++]
          g = data[offset++]
          r = data[offset++]
        } else if (bytesPerPixel === 4) {
          b = data[offset++]
          g = data[offset++]
          r = data[offset++]
          a = data[offset++]
        }

        for (let j = 0; j < count && pixelIndex < width * height; j++) {
          const pixelOffset = pixelIndex * 4
          pixels[pixelOffset] = r
          pixels[pixelOffset + 1] = g
          pixels[pixelOffset + 2] = b
          pixels[pixelOffset + 3] = a
          pixelIndex++
        }
      } else {
        // Raw packet - multiple different pixels
        for (let j = 0; j < count && pixelIndex < width * height; j++) {
          const pixelOffset = pixelIndex * 4
          if (imageType === 11) {
            const gray = data[offset++]
            pixels[pixelOffset] = gray
            pixels[pixelOffset + 1] = gray
            pixels[pixelOffset + 2] = gray
            pixels[pixelOffset + 3] = 255
          } else if (bytesPerPixel === 3) {
            pixels[pixelOffset + 2] = data[offset++]
            pixels[pixelOffset + 1] = data[offset++]
            pixels[pixelOffset] = data[offset++]
            pixels[pixelOffset + 3] = 255
          } else if (bytesPerPixel === 4) {
            pixels[pixelOffset + 2] = data[offset++]
            pixels[pixelOffset + 1] = data[offset++]
            pixels[pixelOffset] = data[offset++]
            pixels[pixelOffset + 3] = data[offset++]
          }
          pixelIndex++
        }
      }
    }
  } else {
    throw new Error(`Unsupported TGA image type: ${imageType}`)
  }

  // Flip vertically if stored bottom-to-top (default TGA orientation)
  if (!topToBottom) {
    const rowSize = width * 4
    const temp = new Uint8ClampedArray(rowSize)
    for (let y = 0; y < height / 2; y++) {
      const topOffset = y * rowSize
      const bottomOffset = (height - 1 - y) * rowSize
      temp.set(pixels.subarray(topOffset, topOffset + rowSize))
      pixels.set(pixels.subarray(bottomOffset, bottomOffset + rowSize), topOffset)
      pixels.set(temp, bottomOffset)
    }
  }

  return { width, height, data: pixels }
}

/** Loaded texture data */
export interface TextureData {
  name: string
  filename: string
  width: number
  height: number
  imageData: ImageData
  canvas: HTMLCanvasElement // Pre-rendered canvas for performance
  image: HTMLImageElement // For Konva Image nodes
}

/** Frame region within a texture */
export interface FrameRegion {
  texture: string // Texture name reference
  location: Point
  size: Size
}

class TextureManagerClass {
  private textures: Map<string, TextureData> = new Map()
  private loading: Map<string, Promise<TextureData>> = new Map()

  /**
   * Load a texture from a File object
   */
  async loadFromFile(file: File): Promise<TextureData> {
    const name = file.name.replace(/\.[^.]+$/, '') // Remove extension

    // Check if already loaded
    if (this.textures.has(name)) {
      return this.textures.get(name)!
    }

    // Check if currently loading
    if (this.loading.has(name)) {
      return this.loading.get(name)!
    }

    // Start loading
    const loadPromise = this.loadTextureFile(file, name)
    this.loading.set(name, loadPromise)

    try {
      const texture = await loadPromise
      this.textures.set(name, texture)
      return texture
    } finally {
      this.loading.delete(name)
    }
  }

  /**
   * Internal texture loading
   */
  private async loadTextureFile(file: File, name: string): Promise<TextureData> {
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'tga') {
      return this.loadTga(file, name)
    } else {
      return this.loadStandardImage(file, name)
    }
  }

  /**
   * Load TGA file using custom decoder
   */
  private async loadTga(file: File, name: string): Promise<TextureData> {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const decoded = decodeTgaCustom(uint8Array)
    const { width, height, data } = decoded

    // Create ImageData from decoded TGA
    const imageData = new ImageData(data, width, height)

    // Create canvas for rendering
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)

    // Create Image element for Konva
    const image = await this.canvasToImage(canvas)

    return {
      name,
      filename: file.name,
      width,
      height,
      imageData,
      canvas,
      image,
    }
  }

  /**
   * Load standard image formats (PNG, JPG, etc.)
   */
  private async loadStandardImage(file: File, name: string): Promise<TextureData> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()

      img.onload = () => {
        // Create canvas and draw image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        // Get ImageData
        const imageData = ctx.getImageData(0, 0, img.width, img.height)

        URL.revokeObjectURL(url)

        resolve({
          name,
          filename: file.name,
          width: img.width,
          height: img.height,
          imageData,
          canvas,
          image: img,
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error(`Failed to load image: ${file.name}`))
      }

      img.src = url
    })
  }

  /**
   * Convert canvas to Image element
   */
  private canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = canvas.toDataURL()
    })
  }

  /**
   * Get a loaded texture by name
   */
  get(name: string): TextureData | undefined {
    return this.textures.get(name)
  }

  /**
   * Check if a texture is loaded
   */
  has(name: string): boolean {
    return this.textures.has(name)
  }

  /**
   * Get all loaded texture names
   */
  getLoadedNames(): string[] {
    return Array.from(this.textures.keys())
  }

  /**
   * Extract a frame region from a texture
   */
  extractFrame(textureName: string, region: FrameRegion): HTMLCanvasElement | null {
    const texture = this.textures.get(textureName)
    if (!texture) return null

    const canvas = document.createElement('canvas')
    canvas.width = region.size.cx
    canvas.height = region.size.cy

    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      texture.canvas,
      region.location.x,
      region.location.y,
      region.size.cx,
      region.size.cy,
      0,
      0,
      region.size.cx,
      region.size.cy
    )

    return canvas
  }

  /**
   * Create an Image element from a frame region
   */
  async extractFrameAsImage(textureName: string, region: FrameRegion): Promise<HTMLImageElement | null> {
    const canvas = this.extractFrame(textureName, region)
    if (!canvas) return null
    return this.canvasToImage(canvas)
  }

  /**
   * Clear all loaded textures
   */
  clear(): void {
    this.textures.clear()
  }

  /**
   * Remove a specific texture
   */
  remove(name: string): void {
    this.textures.delete(name)
  }

  /**
   * Get texture count
   */
  get count(): number {
    return this.textures.size
  }
}

// Singleton instance
export const TextureManager = new TextureManagerClass()
