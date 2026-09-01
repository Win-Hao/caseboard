// 每张卡片一张 canvas 纹理。版式本身写在 src/cards/ 下，
// 这个文件只负责：铺纸底、分派给卡片的 paint、处理字体/图片就绪后的重绘。
//
// 两条硬规则：
//   1. 字体没加载完先画一遍占位，document.fonts.ready 之后重画——
//      否则首屏是 fallback 字体，宽度全错。
//   2. 每次绘制把溢出/截断计数写进 texture.paintDiagnostics，
//      让调用方能在不看像素的情况下判断排版是否合格。

import { CanvasTexture, SRGBColorSpace } from 'three'
import { createRng } from '../core/rng.js'
import { resetDiagnostics, readDiagnostics } from '../cards/helpers.js'

/* ── 纸张做旧：所有卡片共用，除非 spec.bare 为真 ──────────────── */

function paintStock(ctx, w, h, spec, rng) {
  ctx.fillStyle = spec.stock
  ctx.fillRect(0, 0, w, h)

  // 不匀的底色
  for (let i = 0; i < 60; i += 1) {
    const x = rng.next() * w
    const y = rng.next() * h
    const r = w * (0.04 + rng.next() * 0.16)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rng.bool(0.5) ? 'rgba(120,92,52,0.045)' : 'rgba(255,250,232,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // 霉斑
  for (let i = 0; i < 16; i += 1) {
    const x = rng.next() * w
    const y = rng.next() * h
    const r = 1.5 + rng.next() * 5
    ctx.fillStyle = `rgba(126,92,44,${0.05 + rng.next() * 0.09})`
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * (0.6 + rng.next() * 0.7), rng.next() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  // 边缘压暗——纸边总是比中间脏
  const edge = ctx.createLinearGradient(0, 0, 0, h)
  edge.addColorStop(0, 'rgba(90,64,30,0.11)')
  edge.addColorStop(0.14, 'rgba(90,64,30,0)')
  edge.addColorStop(0.86, 'rgba(90,64,30,0)')
  edge.addColorStop(1, 'rgba(90,64,30,0.13)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, w, h)

  const side = ctx.createLinearGradient(0, 0, w, 0)
  side.addColorStop(0, 'rgba(90,64,30,0.09)')
  side.addColorStop(0.12, 'rgba(90,64,30,0)')
  side.addColorStop(0.88, 'rgba(90,64,30,0)')
  side.addColorStop(1, 'rgba(90,64,30,0.10)')
  ctx.fillStyle = side
  ctx.fillRect(0, 0, w, h)
}

function paintCreases(ctx, w, h, rng) {
  ctx.save()
  for (let i = 0; i < 3; i += 1) {
    const y = h * (0.2 + rng.next() * 0.6)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(w * 0.3, y + rng.jitter(5), w * 0.7, y + rng.jitter(5), w, y + rng.jitter(3))
    ctx.stroke()
    ctx.strokeStyle = 'rgba(90,66,34,0.10)'
    ctx.beginPath()
    ctx.moveTo(0, y + 1.5)
    ctx.bezierCurveTo(w * 0.3, y + 1.5 + rng.jitter(5), w * 0.7, y + 1.5 + rng.jitter(5), w, y + 1.5)
    ctx.stroke()
  }
  ctx.restore()
}

/* ── 入口 ─────────────────────────────────────────────────────── */

/**
 * 返回 CanvasTexture。字体或图片就绪后自动重绘并调用 onUpdate。
 */
export function createCardTexture(node, accent, onUpdate = () => {}) {
  const spec = node.spec
  const [tw, th] = spec.texture
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.paintDiagnostics = { textOverflows: 0, textTruncations: 0, imageFailed: false }

  const media = { image: null }

  const paint = () => {
    resetDiagnostics()
    const rng = createRng(`${node.id}:paint`)
    ctx.clearRect(0, 0, tw, th)
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'

    if (spec.bare) {
      spec.paint(ctx, node, tw, th, rng, accent, media)
    } else {
      paintStock(ctx, tw, th, spec, rng)
      spec.paint(ctx, node, tw, th, rng, accent, media)
      paintCreases(ctx, tw, th, rng)
    }

    Object.assign(texture.paintDiagnostics, readDiagnostics())
    texture.needsUpdate = true
  }

  paint()

  // 字体到位后重画一次
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => { paint(); onUpdate() })
  }

  // 需要配图的卡片（目前只有 photo）
  if (spec.usesImage && node.image) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { media.image = img; paint(); onUpdate() }
    img.onerror = () => {
      texture.paintDiagnostics.imageFailed = true
      console.warn(`[board] 图片加载失败: ${node.image}`)
      onUpdate()
    }
    img.src = node.image
  }

  return texture
}
