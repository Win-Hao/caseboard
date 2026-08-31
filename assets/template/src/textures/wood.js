// 木框纹理：竖向渐变 + 54 条正弦扰动的年轮。

import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three'

export function createWoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#5b301c')
  grad.addColorStop(0.5, '#32180f')
  grad.addColorStop(1, '#6c3a22')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 256)

  for (let i = 0; i < 54; i += 1) {
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(19,8,4,0.30)' : 'rgba(190,112,65,0.13)'
    ctx.lineWidth = 1 + (i % 3) * 0.55
    ctx.beginPath()
    for (let x = 0; x <= 1024; x += 16) {
      const y = 8 + i * 4.7 + Math.sin(x * 0.018 + i) * 3.5
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(2.2, 1)
  tex.anisotropy = 4
  return tex
}
