// 纸纤维 bump。所有纸片共用一张，1800 条随机短划线。
// 不加这个，纸在正交相机下会平得像塑料片。

import { CanvasTexture, RepeatWrapping } from 'three'
import { createRng } from '../core/rng.js'

export function createPaperFiberBump() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#888'
  ctx.fillRect(0, 0, 256, 256)

  const rng = createRng('archival-paper-fibers')
  for (let i = 0; i < 1800; i += 1) {
    const x = rng.next() * 256
    const y = rng.next() * 256
    const len = 2 + rng.next() * 6
    ctx.strokeStyle = i % 3 === 0 ? '#666' : '#aaa'
    ctx.globalAlpha = 0.16 + (i % 5) * 0.025
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + rng.next() * 3 - 1)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const tex = new CanvasTexture(canvas)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(2.4, 2.8)
  return tex
}
