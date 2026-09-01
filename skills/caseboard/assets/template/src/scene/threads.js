// 红线。两个批次：亮线本体 + 下沉一点的暗线当自阴影，各 1 次 draw call。
//
// 线是软的：每根线是一条 verlet 质点链，端点钉死在图钉上。
// 拖动板子时相机的加速度取反作为惯性力施到自由质点上——板子一甩，线跟着甩。
// 没有重力项，改用「回位弹簧」把每个质点往初始曲线上拉：
// 静止形状因此严格等于建板时采样的下垂曲线，首帧渲染保持逐位确定，
// 甩完也一定回到原形，不会越晃越走样。
// 只模拟 XY（正交相机正对墙面，Z 分层保持建板时的值不变）。

import { Group, Mesh, BufferGeometry, BufferAttribute, DynamicDrawUsage, Vector3, CatmullRomCurve3, MeshStandardMaterial, Color, DoubleSide } from 'three'
import { createRng } from '../core/rng.js'

const RADIUS = 0.021
const RADIAL = 6            // 截面边数
const SHADE_OFFSET = { x: 0.05, y: -0.06 }

// 手感参数。FORCE 大了像鞭子，小了像铁丝；DAMPING 决定甩完多久停。
// 激励要先过低通再限幅：相机缓动的第一帧速度是突变的，
// 不滤波每次起手都是一记鞭子抽——就是那种「诡异的抽动」。
const FORCE = 3.0           // 相机加速度 → 惯性力的放大
const FORCE_SMOOTH = 0.18   // 激励低通系数（越小越绵）
const FORCE_MAX = 0.045     // 单步力上限（世界单位）
const DAMPING = 0.94        // 每步速度保留比例（60Hz 步长下约 1s 晃停）
const REST_PULL = 0.026     // 回位弹簧强度
const BEND = 0.32           // 抗弯：形变场的拉普拉斯平滑，压锯齿模态
const CONSTRAINT_ITERS = 3  // 段长约束迭代次数
const SLEEP_EPS = 0.0004    // 速度低于这个（且偏移够小）就休眠

/** 开曲线 Chaikin 切角：count 个点 → 2*count-2 个点，端点保留。 */
function chaikin(src, out, count) {
  out[0] = src[0]
  let k = 1
  for (let i = 0; i < count - 1; i += 1) {
    if (i > 0) { out[k] = 0.75 * src[i] + 0.25 * src[i + 1]; k += 1 }
    if (i < count - 2) { out[k] = 0.25 * src[i] + 0.75 * src[i + 1]; k += 1 }
  }
  out[k] = src[count - 1]
}

/** 两点之间一条会下垂的线。 */
function threadCurve(a, b, sag, lift) {
  const mid = new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - sag, Math.max(a.z, b.z) + lift)
  return new CatmullRomCurve3([
    new Vector3(a.x, a.y, a.z + lift),
    mid,
    new Vector3(b.x, b.y, b.z + lift),
  ])
}

export function buildThreads(caseModel, layout, accent, anchors) {
  const group = new Group()
  const rng = createRng(`${caseModel.id}:threads`)
  const links = []

  // 挂点来自 buildHardware —— 就是图钉/夹子的实际位置。
  // 在这里自己算「顶边正中」的话，线会系在钉子旁边的空气上。
  const link = (from, to) => {
    const a = anchors.get(from.id)
    const b = anchors.get(to.id)
    if (a && b) links.push([a, b])
  }
  for (const branch of caseModel.branches) {
    link(caseModel.root, branch)
    for (const leaf of branch.children) link(branch, leaf)
  }
  // 除 root 外，每张卡都该至少连着一根线。连不上说明树结构断了。
  const connected = new Set()
  for (const branch of caseModel.branches) {
    connected.add(branch.id)
    for (const leaf of branch.children) connected.add(leaf.id)
  }
  const orphanIds = caseModel.nodes
    .filter((n) => n.level > 0 && !connected.has(n.id))
    .map((n) => n.id)

  if (links.length === 0) {
    return {
      object: group,
      simulate: () => false,
      diagnostics: { threadCount: 0, threadBatches: 0, orphanPieces: orphanIds.length, orphanIds },
    }
  }

  /* ── 质点链 ── */
  const chains = links.map(([a, b]) => {
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const sag = dist * rng.range(0.025, 0.06)
    const count = Math.max(10, Math.min(22, Math.round(dist * 2.4)))
    const curve = threadCurve(a, b, sag, 0.30)
    const pts = curve.getPoints(count - 1)
    const x = new Float32Array(count)
    const y = new Float32Array(count)
    const px = new Float32Array(count)
    const py = new Float32Array(count)
    const rx = new Float32Array(count)
    const ry = new Float32Array(count)
    const z = new Float32Array(count)
    const seg = new Float32Array(count - 1)
    // 力权重：正弦包络 × 每根线独立增益。中段荡得多、钉子附近几乎不动，
    // 各线响应不同步——同步平移是另一半「诡异」的来源。
    const gain = rng.range(0.72, 1.15)
    const w = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      x[i] = px[i] = rx[i] = pts[i].x
      y[i] = py[i] = ry[i] = pts[i].y
      z[i] = pts[i].z
      w[i] = Math.sin((i / (count - 1)) * Math.PI) * gain
    }
    for (let i = 0; i < count - 1; i += 1) {
      seg[i] = Math.hypot(x[i + 1] - x[i], y[i + 1] - y[i])
    }
    // 渲染前做一遍 Chaikin 切角细分：质点折线 → 圆滑曲线。z 静态，预细分一次。
    const sub = 2 * count - 2
    const sx = new Float32Array(sub)
    const sy = new Float32Array(sub)
    const sz = new Float32Array(sub)
    chaikin(z, sz, count)
    return { count, x, y, px, py, rx, ry, z, seg, w, sub, sx, sy, sz }
  })

  /* ── 几何：固定拓扑，每帧只重写 position/normal ── */
  const totalRings = chains.reduce((n, c) => n + c.sub, 0)
  const makeBatch = (radius, zShift, material, renderOrder) => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(totalRings * RADIAL * 3)
    const normals = new Float32Array(totalRings * RADIAL * 3)
    const indices = []
    let ringBase = 0
    for (const c of chains) {
      for (let i = 0; i < c.sub - 1; i += 1) {
        for (let r = 0; r < RADIAL; r += 1) {
          const r2 = (r + 1) % RADIAL
          const a0 = (ringBase + i) * RADIAL + r
          const a1 = (ringBase + i) * RADIAL + r2
          const b0 = (ringBase + i + 1) * RADIAL + r
          const b1 = (ringBase + i + 1) * RADIAL + r2
          indices.push(a0, b0, a1, a1, b0, b1)
        }
      }
      ringBase += c.sub
    }
    geo.setIndex(indices)
    geo.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
    geo.setAttribute('normal', new BufferAttribute(normals, 3).setUsage(DynamicDrawUsage))
    const mesh = new Mesh(geo, material)
    mesh.renderOrder = renderOrder
    mesh.frustumCulled = false
    group.add(mesh)
    return { geo, positions, normals, radius, zShift }
  }

  const shade = makeBatch(RADIUS * 0.9, -0.04, new MeshStandardMaterial({
    color: new Color(accent).multiplyScalar(0.42), roughness: 0.9, transparent: true, opacity: 0.55, side: DoubleSide,
  }), 69)
  const main = makeBatch(RADIUS, 0, new MeshStandardMaterial({
    color: accent, roughness: 0.86, metalness: 0, side: DoubleSide,
  }), 70)

  const writeBatch = (batch, ox, oy) => {
    const { positions, normals, radius, zShift } = batch
    let v = 0
    for (const c of chains) {
      for (let i = 0; i < c.sub; i += 1) {
        // 切向量：中间用两侧差分，端点用单侧
        const i0 = Math.max(0, i - 1)
        const i1 = Math.min(c.sub - 1, i + 1)
        let tx = c.sx[i1] - c.sx[i0]
        let ty = c.sy[i1] - c.sy[i0]
        let tz = c.sz[i1] - c.sz[i0]
        const tl = Math.hypot(tx, ty, tz) || 1
        tx /= tl; ty /= tl; tz /= tl
        // N1 = T × ez（贴墙平面内的法向），N2 = T × N1（近似 ±Z）
        let n1x = ty, n1y = -tx
        const n1l = Math.hypot(n1x, n1y) || 1
        n1x /= n1l; n1y /= n1l
        const n2x = ty * 0 - tz * n1y
        const n2y = tz * n1x - tx * 0
        const n2z = tx * n1y - ty * n1x
        const cx = c.sx[i] + ox
        const cy = c.sy[i] + oy
        const cz = c.sz[i] + zShift
        for (let r = 0; r < RADIAL; r += 1) {
          const ang = (r / RADIAL) * Math.PI * 2
          const ca = Math.cos(ang)
          const sa = Math.sin(ang)
          const nx = ca * n1x + sa * n2x
          const ny = ca * n1y + sa * n2y
          const nz = sa * n2z
          positions[v] = cx + nx * radius
          normals[v] = nx
          v += 1
          positions[v] = cy + ny * radius
          normals[v] = ny
          v += 1
          positions[v] = cz + nz * radius
          normals[v] = nz
          v += 1
        }
      }
    }
    batch.geo.attributes.position.needsUpdate = true
    batch.geo.attributes.normal.needsUpdate = true
  }

  const writeAll = () => {
    for (const c of chains) {
      chaikin(c.x, c.sx, c.count)
      chaikin(c.y, c.sy, c.count)
    }
    writeBatch(main, 0, 0)
    writeBatch(shade, SHADE_OFFSET.x, SHADE_OFFSET.y)
  }
  writeAll()
  main.geo.computeBoundingSphere()
  shade.geo.computeBoundingSphere()

  /* ── 模拟 ──
     固定 60Hz 步进：高刷屏上按帧跑会让阻尼平方衰减（120Hz 下晃 0.2s 就死），
     手感随显示器变。相机位移攒进 pending，凑够一步的时间才推进一步。 */
  const STEP = 1000 / 60
  let awake = false
  let prevAx = 0
  let prevAy = 0
  let fSx = 0
  let fSy = 0
  let acc = 0
  let lastT = 0
  let pendX = 0
  let pendY = 0

  function stepPhysics(camDx, camDy) {
    // 惯性力 = 相机加速度取反。速度恒定时几乎不出力，起手和急停时甩得最狠。
    const rawX = -(camDx - prevAx) * FORCE
    const rawY = -(camDy - prevAy) * FORCE
    prevAx = camDx
    prevAy = camDy
    fSx += (rawX - fSx) * FORCE_SMOOTH
    fSy += (rawY - fSy) * FORCE_SMOOTH
    let fx = fSx
    let fy = fSy
    const mag = Math.hypot(fx, fy)
    if (mag > FORCE_MAX) {
      fx = (fx / mag) * FORCE_MAX
      fy = (fy / mag) * FORCE_MAX
    }
    const kicked = Math.abs(fx) > 1e-5 || Math.abs(fy) > 1e-5
    if (!awake && !kicked) return
    awake = true

    let maxVel = 0
    let maxOff = 0
    for (const c of chains) {
      const last = c.count - 1
      for (let i = 1; i < last; i += 1) {
        const vx = (c.x[i] - c.px[i]) * DAMPING + fx * c.w[i] + (c.rx[i] - c.x[i]) * REST_PULL
        const vy = (c.y[i] - c.py[i]) * DAMPING + fy * c.w[i] + (c.ry[i] - c.y[i]) * REST_PULL
        c.px[i] = c.x[i]
        c.py[i] = c.y[i]
        c.x[i] += vx
        c.y[i] += vy
      }
      // 段长约束：把绳子拉回原长。端点权重 0（钉死），中间点对半分摊
      for (let k = 0; k < CONSTRAINT_ITERS; k += 1) {
        for (let i = 0; i < last; i += 1) {
          const dx = c.x[i + 1] - c.x[i]
          const dy = c.y[i + 1] - c.y[i]
          const d = Math.hypot(dx, dy) || 1
          const diff = (d - c.seg[i]) / d
          const w0 = i === 0 ? 0 : 1
          const w1 = i + 1 === last ? 0 : 1
          const sum = w0 + w1
          if (!sum) continue
          const m0 = w0 / sum
          const m1 = w1 / sum
          c.x[i] += dx * diff * m0
          c.y[i] += dy * diff * m0
          c.x[i + 1] -= dx * diff * m1
          c.y[i + 1] -= dy * diff * m1
        }
      }
      // 抗弯：把每个内点的「偏离量」往两侧邻居的偏离均值拉。
      // 平滑的是形变场而不是位置本身——静止垂度不受影响，锯齿模态被压掉。
      for (let i = 1; i < last; i += 1) {
        const dev0x = c.x[i - 1] - c.rx[i - 1]
        const dev0y = c.y[i - 1] - c.ry[i - 1]
        const dev2x = c.x[i + 1] - c.rx[i + 1]
        const dev2y = c.y[i + 1] - c.ry[i + 1]
        const devx = c.x[i] - c.rx[i]
        const devy = c.y[i] - c.ry[i]
        c.x[i] += ((dev0x + dev2x) / 2 - devx) * BEND
        c.y[i] += ((dev0y + dev2y) / 2 - devy) * BEND
      }
      for (let i = 1; i < last; i += 1) {
        const v = Math.abs(c.x[i] - c.px[i]) + Math.abs(c.y[i] - c.py[i])
        const o = Math.abs(c.x[i] - c.rx[i]) + Math.abs(c.y[i] - c.ry[i])
        if (v > maxVel) maxVel = v
        if (o > maxOff) maxOff = o
      }
    }

    // 休眠：速度和残余偏移都小才钉回原形。偏移阈值约半个线径，肉眼看不出跳。
    if (!kicked && maxVel < SLEEP_EPS && maxOff < 0.012) {
      for (const c of chains) {
        for (let i = 1; i < c.count - 1; i += 1) {
          c.x[i] = c.px[i] = c.rx[i]
          c.y[i] = c.py[i] = c.ry[i]
        }
      }
      awake = false
      fSx = 0
      fSy = 0
    }
  }

  function simulate(camDx, camDy) {
    const now = performance.now()
    const dt = lastT ? Math.min(now - lastT, 100) : STEP
    lastT = now
    pendX += camDx
    pendY += camDy
    acc += dt
    let steps = Math.floor(acc / STEP)
    if (steps <= 0) return awake
    if (steps > 3) steps = 3
    acc -= steps * STEP
    const wasAwake = awake
    const sx = pendX / steps
    const sy = pendY / steps
    pendX = 0
    pendY = 0
    for (let s = 0; s < steps; s += 1) stepPhysics(sx, sy)
    if (awake || wasAwake) writeAll()
    return awake || wasAwake
  }

  return {
    object: group,
    simulate,
    diagnostics: { threadCount: links.length, threadBatches: 2, orphanPieces: orphanIds.length, orphanIds },
  }
}
