// 图钉 / 胶带 / 长尾夹 / 订书钉。全部 InstancedMesh，九个批次一共几十次
// draw call 都不到——这是能同时挂几十张卡还跑满帧的原因。

import {
  Group, InstancedMesh, Object3D, Color,
  LatheGeometry, TorusGeometry, CylinderGeometry, BoxGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial,
  Vector2,
} from 'three'
import { createRng } from '../core/rng.js'
import { PIN_COLORS } from '../core/spec.js'

const BATCHES = [
  'pin-head', 'pin-collar', 'pin-stem',
  'tape-film',
  'clip-body', 'clip-handle',
  'staple-crown', 'staple-legs',
]

function geometryFor(batch) {
  switch (batch) {
    case 'pin-head': {
      // 车削出一个鼓起的塑料帽
      const pts = []
      for (let i = 0; i <= 10; i += 1) {
        const t = i / 10
        pts.push(new Vector2(Math.sin(t * Math.PI * 0.5) * 0.135, 0.115 - t * 0.115))
      }
      pts.push(new Vector2(0, 0))
      return new LatheGeometry(pts, 16)
    }
    case 'pin-collar': return new TorusGeometry(0.082, 0.020, 8, 18)
    case 'pin-stem': return new CylinderGeometry(0.020, 0.011, 0.22, 8)
    case 'tape-film': return new PlaneGeometry(1, 1)
    case 'clip-body': return new BoxGeometry(0.46, 0.28, 0.05)
    case 'clip-handle': return new TorusGeometry(0.125, 0.020, 6, 14)
    case 'staple-crown': return new BoxGeometry(0.32, 0.045, 0.024)
    case 'staple-legs': return new BoxGeometry(0.042, 0.12, 0.024)
    default: return new BoxGeometry(0.1, 0.1, 0.1)
  }
}

function materialFor(batch) {
  switch (batch) {
    case 'pin-head':
      return new MeshPhysicalMaterial({ roughness: 0.28, metalness: 0.08, clearcoat: 0.86, envMapIntensity: 0.78 })
    case 'pin-collar':
      return new MeshStandardMaterial({ roughness: 0.24, metalness: 0.84, envMapIntensity: 0.94 })
    case 'tape-film':
      return new MeshPhysicalMaterial({
        roughness: 0.82, metalness: 0, clearcoat: 0.08,
        transparent: true, opacity: 0.55, depthWrite: false,
      })
    default:
      return new MeshStandardMaterial({ roughness: 0.46, metalness: 0.62, envMapIntensity: 0.72 })
  }
}

/**
 * 一个 placement 需要哪些五金件，以及红线该系在哪。
 *
 * 返回 anchor 是关键：图钉的水平位置带随机抖动，最大能偏出近一个世界单位。
 * 牵线那边如果自己再算一遍「顶边正中」，线就会飘在钉子外面。
 * 挂点只能有一个来源，就是这里。
 */
function treatmentsFor(placement, rng) {
  const { node } = placement
  const [w, h] = node.size
  const top = h / 2
  const out = []
  let anchorLocal = { lx: 0, ly: top - 0.12 }   // 没有五金件时的兜底：顶边正中
  const at = (lx, ly, extra = {}) => {
    // 卡片是转过的，五金件要跟着转到卡片的实际位置
    const c = Math.cos(placement.rotation)
    const s = Math.sin(placement.rotation)
    return {
      x: placement.x + lx * c - ly * s,
      y: placement.y + lx * s + ly * c,
      rotation: placement.rotation,
      ...extra,
    }
  }

  switch (node.spec.hardware) {
    // 自带背胶的纸（便利贴）不需要任何五金件
    case 'none':
      break
    case 'tape': {
      const n = rng.bool(0.55) ? 2 : 1
      for (let i = 0; i < n; i += 1) {
        const lx = n === 1 ? rng.jitter(w * 0.16) : (i === 0 ? -w * 0.32 : w * 0.32)
        // ly 只能取一次。分别给挂点和胶带各摇一个随机数的话，两者会差出半个胶带宽
        const ly = top - rng.range(0.02, 0.12)
        if (i === 0) anchorLocal = { lx, ly }
        out.push({
          batch: 'tape-film',
          ...at(lx, ly),
          scale: [rng.range(1.0, 1.4), rng.range(0.34, 0.44), 1],
          spin: rng.jitter(0.5),
          color: new Color('#efe7cf'),
        })
      }
      break
    }
    case 'clip': {
      const lx = rng.jitter(w * 0.22)
      anchorLocal = { lx, ly: top - 0.03 }
      const base = at(lx, top - 0.03)
      out.push({ batch: 'clip-body', ...base, spin: rng.jitter(0.18), color: new Color('#9aa0a6') })
      out.push({ batch: 'clip-handle', ...base, spin: rng.jitter(0.18), lift: 0.05, color: new Color('#c2c7cb') })
      break
    }
    case 'staple': {
      for (const lx of [-w * 0.34, w * 0.34]) {
        const ly = top - rng.range(0.08, 0.18)
        if (lx < 0) anchorLocal = { lx, ly }
        const base = at(lx, ly)
        const spin = rng.jitter(0.35)
        out.push({ batch: 'staple-crown', ...base, spin, color: new Color('#b9bec2') })
        out.push({ batch: 'staple-legs', ...base, spin, offset: [-0.14, -0.075], color: new Color('#a3a8ac') })
        out.push({ batch: 'staple-legs', ...base, spin, offset: [0.14, -0.075], color: new Color('#a3a8ac') })
      }
      break
    }
    default: {
      // 图钉
      const lx = rng.jitter(w * 0.2)
      const ly = top - rng.range(0.14, 0.26)
      anchorLocal = { lx, ly }
      const base = at(lx, ly)
      const color = new Color(rng.pick(PIN_COLORS))
      out.push({ batch: 'pin-stem', ...base, tilt: true, lift: -0.02, color: new Color('#8f959a') })
      out.push({ batch: 'pin-collar', ...base, lift: 0.06, color: new Color('#c9ced2') })
      out.push({ batch: 'pin-head', ...base, lift: 0.085, tilt: true, color })
      break
    }
  }

  const anchor = at(anchorLocal.lx, anchorLocal.ly)
  return { items: out, anchor: { x: anchor.x, y: anchor.y, z: (placement.z ?? 0.4) + 0.17 } }
}

export function buildHardware(placements, seed) {
  const group = new Group()
  const rng = createRng(`${seed}:hardware`)
  const buckets = new Map(BATCHES.map((b) => [b, []]))

  // 挂点表：红线全靠它，不要在别处另算一遍
  const anchors = new Map()
  for (const p of placements) {
    const { items, anchor } = treatmentsFor(p, rng)
    anchors.set(p.node.id, anchor)
    for (const t of items) buckets.get(t.batch).push({ ...t, z: p.z ?? 0.4 })
  }

  const dummy = new Object3D()
  let instanceCount = 0
  let triangles = 0

  for (const batch of BATCHES) {
    const items = buckets.get(batch)
    if (items.length === 0) continue

    const geo = geometryFor(batch)
    const mesh = new InstancedMesh(geo, materialFor(batch), items.length)
    mesh.name = batch
    mesh.renderOrder = 100
    const tri = (geo.index ? geo.index.count : geo.attributes.position.count) / 3
    triangles += tri * items.length

    items.forEach((t, i) => {
      dummy.position.set(
        t.x + (t.offset?.[0] ?? 0),
        t.y + (t.offset?.[1] ?? 0),
        t.z + 0.08 + (t.lift ?? 0),
      )
      dummy.rotation.set(0, 0, (t.rotation ?? 0) + (t.spin ?? 0))
      // 圆柱/车削体默认沿 Y 轴，要立起来朝向观者
      if (batch === 'pin-stem' || batch === 'pin-head') dummy.rotation.x = Math.PI / 2
      const s = t.scale ?? [1, 1, 1]
      dummy.scale.set(s[0], s[1], s[2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, t.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
    instanceCount += items.length
  }

  return {
    object: group,
    anchors,
    diagnostics: {
      hardwareBatches: group.children.length,
      hardwareInstances: instanceCount,
      hardwareTriangles: Math.round(triangles),
    },
  }
}
