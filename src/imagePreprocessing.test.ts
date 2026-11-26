import { describe, expect, it } from 'vitest'
import { prepareImageTensor } from './imagePreprocessing'

describe('prepareImageTensor', () => {
  it('resizes and normalizes to channel-first 224x224 RGB', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4)
    for (let pixel = 0; pixel < 16; pixel += 1) {
      rgba.set([128, 64, 32, 255], pixel * 4)
    }

    const tensor = prepareImageTensor(rgba, 4, 4)
    const planeSize = 224 * 224

    expect(tensor).toHaveLength(3 * planeSize)
    expect(tensor[0]).toBeCloseTo((128 / 255 - 0.485) / 0.229, 2)
    expect(tensor[planeSize]).toBeCloseTo((64 / 255 - 0.456) / 0.224, 2)
    expect(tensor[planeSize * 2]).toBeCloseTo((32 / 255 - 0.406) / 0.225, 2)
  })

  it('rejects mismatched image dimensions', () => {
    expect(() => prepareImageTensor(new Uint8ClampedArray(4), 2, 2)).toThrow()
  })
})
