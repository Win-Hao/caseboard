// 卡片几何。边缘是真轮廓，不是 alpha 抠图——正交相机下 alpha 抠图会露馅，
// 而且投影是按轮廓算的，抠图的话影子还是方的。
// 六种边缘的枚举和说明在 edges.js（那边不依赖 three，check.mjs 也要用）。

import { Shape, ShapeGeometry, PlaneGeometry, CanvasTexture } from 'three'
import { createRng } from '../core/rng.js'

export { EDGES } from './edges.js'

/** 沿一条边走，每步按法线方向加一个偏移量。 */
function walk(pts, x0, y0, x1, y1, nx, ny, steps, offsetAt) {
  for (let i = 0; i < steps; i += 1) {
    const t = i / steps
    const d = offsetAt(i, steps)
    pts.push({ x: x0 + (x1 - x0) * t + nx * d, y: y0 + (y1 - y0) * t + ny * d })
  }
}

/** 半圆齿孔：沿一条边铺一串向内凹的半圆。 */
function scallop(pts, x0, y0, x1, y1, nx, ny, radius) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  const count = Math.max(3, Math.round(len / (radius * 2)))
  const step = len / count
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const r = step / 2
  for (let i = 0; i < count; i += 1) {
    const base = i * step
    // 每个齿画 4 个点，够圆又不至于把顶点数堆爆
    for (let k = 0; k <= 4; k += 1) {
      const a = Math.PI - (k / 4) * Math.PI
      const along = base + r + Math.cos(a) * r
      const depth = Math.sin(a) * r * 0.85
      pts.push({ x: x0 + ux * along + nx * depth, y: y0 + uy * along + ny * depth })
    }
  }
}

/** 生成卡片轮廓点（局部坐标，中心在原点，逆时针）。 */
export function outlineOf(node, seed) {
  const [w, h] = node.size
  const hw = w / 2
  const hh = h / 2
  const edge = node.spec.edge
  if (edge === 'clean') {
    return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }]
  }

  const rng = createRng(`${seed}:edge`)
  const pts = []
  const short = Math.min(w, h)

  if (edge === 'notched') {
    const c = short * 0.075
    return [
      { x: -hw + c, y: -hh }, { x: hw - c, y: -hh },
      { x: hw, y: -hh + c }, { x: hw, y: hh - c },
      { x: hw - c, y: hh }, { x: -hw + c, y: hh },
      { x: -hw, y: hh - c }, { x: -hw, y: -hh + c },
    ]
  }

  if (edge === 'perforated') {
    const r = short * 0.055
    scallop(pts, -hw, -hh, hw, -hh, 0, 1, r)    // 下
    scallop(pts, hw, -hh, hw, hh, -1, 0, r)     // 右
    scallop(pts, hw, hh, -hw, hh, 0, -1, r)     // 上
    scallop(pts, -hw, hh, -hw, -hh, 1, 0, r)    // 左
    return pts
  }

  // ripped / torn-top / deckle 都是带噪声的直边，差别只在振幅和频率
  const amp = edge === 'deckle' ? short * 0.010 : short * 0.032
  const density = edge === 'deckle' ? 7.5 : 3.2
  const sx = Math.max(6, Math.round(w * density))
  const sy = Math.max(5, Math.round(h * density))
  const jag = (i) => rng.range(-amp, amp) * (i === 0 ? 0.3 : 1)
  const flat = () => 0

  const topOnly = edge === 'torn-top'
  walk(pts, -hw, -hh, hw, -hh, 0, 1, topOnly ? 2 : sx, topOnly ? flat : jag)   // 下
  walk(pts, hw, -hh, hw, hh, -1, 0, topOnly ? 2 : sy, topOnly ? flat : jag)    // 右
  walk(pts, hw, hh, -hw, hh, 0, -1, Math.round(sx * (topOnly ? 1.4 : 1)), jag) // 上
  walk(pts, -hw, hh, -hw, -hh, 1, 0, topOnly ? 2 : sy, topOnly ? flat : jag)   // 左
  return pts
}

export function createCardGeometry(node, seed) {
  const [w, h] = node.size
  if (node.spec.edge === 'clean') return new PlaneGeometry(w, h)

  const pts = outlineOf(node, seed)
  const shape = new Shape()
  shape.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i += 1) shape.lineTo(pts[i].x, pts[i].y)
  shape.closePath()

  const geo = new ShapeGeometry(shape, 1)
  // ShapeGeometry 直接把顶点坐标当 UV，必须归一化，否则贴图全乱
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i += 1) {
    uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h)
  }
  uv.needsUpdate = true
  return geo
}

/** 卡片投影用的软 alpha 贴图：白色圆角矩形 + 高斯模糊。 */
export function createShadowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)
  ctx.filter = 'blur(17px)'
  ctx.fillStyle = '#ffffff'
  const inset = 34
  ctx.beginPath()
  ctx.roundRect(inset, inset, size - inset * 2, size - inset * 2, 10)
  ctx.fill()
  ctx.filter = 'none'
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}
