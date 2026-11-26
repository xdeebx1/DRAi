const MODEL_SIZE = 224
const RESIZE_SHORT_EDGE = 256
const CHANNEL_MEAN = [0.485, 0.456, 0.406]
const CHANNEL_STD = [0.229, 0.224, 0.225]

interface Contribution {
  index: number
  weight: number
}

function cubicWeight(distance: number): number {
  const x = Math.abs(distance)
  const a = -0.5

  if (x <= 1) {
    return ((a + 2) * x - (a + 3)) * x * x + 1
  }
  if (x < 2) {
    return ((a * x - 5 * a) * x + 8 * a) * x - 4 * a
  }
  return 0
}

function makeContributions(sourceSize: number, targetSize: number): Contribution[][] {
  const scale = sourceSize / targetSize
  const filterScale = Math.max(1, scale)
  const support = 2 * filterScale

  return Array.from({ length: targetSize }, (_, targetIndex) => {
    const center = (targetIndex + 0.5) * scale
    const first = Math.max(0, Math.floor(center - support))
    const last = Math.min(sourceSize, Math.ceil(center + support))
    const contributions: Contribution[] = []
    let totalWeight = 0

    for (let sourceIndex = first; sourceIndex < last; sourceIndex += 1) {
      const weight = cubicWeight((sourceIndex + 0.5 - center) / filterScale)
      contributions.push({ index: sourceIndex, weight })
      totalWeight += weight
    }

    return contributions.map(({ index, weight }) => ({
      index,
      weight: weight / totalWeight,
    }))
  })
}

function resizeRgb(
  rgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): Uint8ClampedArray {
  const horizontal = new Float32Array(sourceHeight * targetWidth * 3)
  const horizontalContributions = makeContributions(sourceWidth, targetWidth)

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const outputOffset = (y * targetWidth + x) * 3
      for (const { index, weight } of horizontalContributions[x]) {
        const inputOffset = (y * sourceWidth + index) * 4
        horizontal[outputOffset] += rgba[inputOffset] * weight
        horizontal[outputOffset + 1] += rgba[inputOffset + 1] * weight
        horizontal[outputOffset + 2] += rgba[inputOffset + 2] * weight
      }
    }
  }

  const resized = new Uint8ClampedArray(targetWidth * targetHeight * 4)
  const verticalContributions = makeContributions(sourceHeight, targetHeight)

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const outputOffset = (y * targetWidth + x) * 4
      let red = 0
      let green = 0
      let blue = 0
      for (const { index, weight } of verticalContributions[y]) {
        const inputOffset = (index * targetWidth + x) * 3
        red += horizontal[inputOffset] * weight
        green += horizontal[inputOffset + 1] * weight
        blue += horizontal[inputOffset + 2] * weight
      }
      resized[outputOffset] = red
      resized[outputOffset + 1] = green
      resized[outputOffset + 2] = blue
      resized[outputOffset + 3] = 255
    }
  }

  return resized
}

export function prepareImageTensor(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  if (width < 1 || height < 1 || rgba.length !== width * height * 4) {
    throw new Error('تعذر قراءة أبعاد الصورة.')
  }

  const scale = RESIZE_SHORT_EDGE / Math.min(width, height)
  const resizedWidth = Math.round(width * scale)
  const resizedHeight = Math.round(height * scale)
  const resized = resizeRgb(rgba, width, height, resizedWidth, resizedHeight)
  const left = Math.floor((resizedWidth - MODEL_SIZE) / 2)
  const top = Math.floor((resizedHeight - MODEL_SIZE) / 2)
  const tensor = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE)

  for (let y = 0; y < MODEL_SIZE; y += 1) {
    for (let x = 0; x < MODEL_SIZE; x += 1) {
      const pixelOffset = ((top + y) * resizedWidth + left + x) * 4
      const outputOffset = y * MODEL_SIZE + x

      for (let channel = 0; channel < 3; channel += 1) {
        tensor[channel * MODEL_SIZE * MODEL_SIZE + outputOffset] =
          resized[pixelOffset + channel] / 255 / CHANNEL_STD[channel] -
          CHANNEL_MEAN[channel] / CHANNEL_STD[channel]
      }
    }
  }

  return tensor
}
