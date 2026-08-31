// 卡片本体 + 卡片投影 + 悬停高光。

import {
  Group, Mesh, InstancedMesh, Object3D, PlaneGeometry, Color,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  AdditiveBlending,
} from 'three'
import { createCardGeometry, createShadowTexture } from './geometry.js'
import { createCardTexture } from '../textures/card.js'
import { createPaperFiberBump } from '../textures/fibers.js'
import { createRng } from '../core/rng.js'
import { SURFACE } from '../core/spec.js'

// 主光在左上，所以影子一律往右下偏。改光向必须同步改这两个数。
const SHADOW_OFFSET = { x: 0.11, y: -0.14, z: -0.035 }

// 悬停高光的手感：EMISSIVE 低于 0.1 在总览缩放下几乎无感，
// 高于 0.3 深色墨字会被抬成金色、对比度掉得厉害。0.24 是两头都保住的值。
const HOVER_GLOW = '#ffc84d'
const HOVER_LIFT = 0.055
const HOVER_SCALE = 1.018
const HOVER_EMISSIVE = 0.24
// 边缘荧光：垫在卡片背后的一张模糊光斑（复用投影贴图），加法混合。
// 贴图实心区约占 60%，被卡片挡住；只有模糊衰减那一圈露出来，形成描边光晕。
const GLOW_OPACITY = 0.5
const GLOW_MARGIN = { x: 1.42, y: 1.52 }
const EASE = 0.28

export function buildPieces(caseModel, layout, accent, onTextureUpdate) {
  const group = new Group()
  const fiberBump = createPaperFiberBump()
  const rng = createRng(`${caseModel.id}:surface`)

  const records = []
  const diagnostics = { textOverflows: 0, textTruncations: 0, imageFailures: 0, overflowIds: [] }

  for (const p of layout.placements) {
    const node = p.node
    const surface = SURFACE[node.spec.surface] ?? SURFACE.paper

    const texture = createCardTexture(node, accent, onTextureUpdate)
    // emissive 必须在这里初始化。three.js 的 emissiveIntensity 默认是 1，
    // 留给 applyHover 去设颜色的话，第一帧会是「琥珀色 × 全强度」——
    // 整块板泛白，要等衰减若干帧才正常。
    const emissiveInit = { emissive: new Color(HOVER_GLOW), emissiveIntensity: 0 }
    const material = surface.physical
      ? new MeshPhysicalMaterial({
          map: texture, bumpMap: fiberBump, bumpScale: surface.bumpScale,
          roughness: surface.roughness, metalness: 0, clearcoat: surface.clearcoat,
          envMapIntensity: surface.envMapIntensity, transparent: true, ...emissiveInit,
        })
      : new MeshStandardMaterial({
          map: texture, bumpMap: fiberBump, bumpScale: surface.bumpScale,
          roughness: surface.roughness, metalness: 0,
          envMapIntensity: surface.envMapIntensity, transparent: true, ...emissiveInit,
        })

    const mesh = new Mesh(createCardGeometry(node, node.id), material)
    mesh.position.set(p.x, p.y, p.z)
    // 极微小的三轴倾斜：纸不会完全平贴在墙上
    mesh.rotation.x = rng.jitter(0.013)
    mesh.rotation.y = rng.jitter(0.011)
    mesh.rotation.z = p.rotation
    mesh.renderOrder = p.layer + 2
    mesh.userData.nodeId = node.id
    group.add(mesh)

    records.push({ node, placement: p, mesh, material, texture })
  }

  // 投影：一张共享 alpha 贴图，按卡片尺寸缩放
  const shadowTex = createShadowTexture()
  const shadows = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      map: shadowTex, color: '#150b06', transparent: true, opacity: 0.72,
      depthWrite: false,
    }),
    records.length,
  )
  shadows.renderOrder = 1
  const dummy = new Object3D()
  records.forEach((r, i) => {
    const [w, h] = r.node.size
    dummy.position.set(
      r.placement.x + SHADOW_OFFSET.x,
      r.placement.y + SHADOW_OFFSET.y,
      r.placement.z + SHADOW_OFFSET.z,
    )
    dummy.rotation.set(0, 0, r.placement.rotation)
    // 贴图边缘留了 34/256 的模糊余量，放大补回来
    dummy.scale.set(w * 1.42, h * 1.5, 1)
    dummy.updateMatrix()
    shadows.setMatrixAt(i, dummy.matrix)
  })
  shadows.instanceMatrix.needsUpdate = true
  group.add(shadows)

  // 悬停光晕：全场只有一张，applyHover 把它挪到悬停卡背后
  const glow = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      map: shadowTex, color: HOVER_GLOW, transparent: true, opacity: 0,
      blending: AdditiveBlending, depthWrite: false,
    }),
  )
  glow.renderOrder = 1.5
  glow.visible = false
  group.add(glow)

  const collect = () => {
    diagnostics.textOverflows = 0
    diagnostics.textTruncations = 0
    diagnostics.imageFailures = 0
    diagnostics.overflowIds = []
    for (const r of records) {
      const d = r.texture.paintDiagnostics
      if (!d) continue
      diagnostics.textOverflows += d.textOverflows
      diagnostics.textTruncations += d.textTruncations
      if (d.imageFailed) diagnostics.imageFailures += 1
      if (d.textOverflows > 0) diagnostics.overflowIds.push(r.node.id)
    }
    return diagnostics
  }

  return { object: group, records, glow, glowId: null, byId: new Map(records.map((r) => [r.node.id, r])), collect }
}

/**
 * 悬停：抬起 + 放大 + 提亮 + 边缘光晕。
 * 返回是否还在动——调用方据此决定要不要继续出帧，
 * 否则移开鼠标后动画会停在半路上不再重绘。
 */
export function applyHover(pieces, hoveredId) {
  const { records, glow } = pieces
  let moving = false
  let hovered = null
  for (const r of records) {
    const on = r.node.id === hoveredId
    if (on) hovered = r

    const z = r.placement.z + (on ? HOVER_LIFT : 0)
    const s = on ? HOVER_SCALE : 1
    const e = on ? HOVER_EMISSIVE : 0

    r.mesh.position.z += (z - r.mesh.position.z) * EASE
    const ns = r.mesh.scale.x + (s - r.mesh.scale.x) * EASE
    r.mesh.scale.set(ns, ns, 1)
    r.material.emissiveIntensity += (e - r.material.emissiveIntensity) * EASE

    if (Math.abs(z - r.mesh.position.z) > 1e-4
      || Math.abs(s - ns) > 1e-4
      || Math.abs(e - r.material.emissiveIntensity) > 1e-4) {
      moving = true
    } else {
      // 收敛后钉死，免得残留一点点偏移一直触发重绘
      r.mesh.position.z = z
      r.mesh.scale.set(s, s, 1)
      r.material.emissiveIntensity = e
    }
  }

  // 光晕跟卡：位置直接跳（换卡不做飞行），亮度缓入缓出
  if (hovered && pieces.glowId !== hovered.node.id) {
    pieces.glowId = hovered.node.id
    const [w, h] = hovered.node.size
    glow.position.set(hovered.placement.x, hovered.placement.y, hovered.placement.z - 0.02)
    glow.rotation.z = hovered.placement.rotation
    glow.scale.set(w * GLOW_MARGIN.x, h * GLOW_MARGIN.y, 1)
    glow.renderOrder = hovered.mesh.renderOrder - 0.5
    glow.visible = true
  }
  if (!hovered) pieces.glowId = null
  const m = glow.material
  const target = hovered ? GLOW_OPACITY : 0
  m.opacity += (target - m.opacity) * EASE
  if (Math.abs(target - m.opacity) > 1e-3) moving = true
  else {
    m.opacity = target
    if (!hovered) glow.visible = false
  }
  return moving
}
