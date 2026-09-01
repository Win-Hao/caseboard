// 布局求解。目标：像人随手钉上去的，不像 CSS grid。
//
// 1. 板子尺寸由内容总面积反推（保持约 38% 覆盖率）
// 2. root 居中，L1 分支撒在一圈椭圆上，L2 贴着各自父节点、朝外偏
// 3. Gauss-Seidel 松弛把重叠推开——就地更新，不用快照，
//    否则同一轮里两张卡会互相抵消彼此的推力，永远收敛不了
// 4. 还是挤，就把板子放大重来。宁可板子空一点，也不要糊成一团。

import { createRng } from './rng.js'
import { BOARD } from './spec.js'

const ASPECT = 1.835
const TARGET_COVERAGE = 0.46
const EDGE_MARGIN = 0.5
const MAX_TILT = 0.085
const GAP = 0.17            // 卡片之间留的空气
const OVERLAP_BUDGET = 0.14 // 超过就扩板重来
const SIZE_STEPS = [1, 1.06, 1.13, 1.2, 1.28, 1.37, 1.47]
const SEEDS_PER_SIZE = 3    // 同一尺寸先换种子重排，再考虑放大板子（密板会加倍）

const area = (n) => n.size[0] * n.size[1]

function rectOverlap(a, b) {
  const dx = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)
  const dy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2)
  return dx > 0 && dy > 0 ? dx * dy : 0
}

/** 旋转后的外接盒。 */
function boundsOf(p) {
  const c = Math.abs(Math.cos(p.rotation))
  const s = Math.abs(Math.sin(p.rotation))
  return {
    x: p.x, y: p.y,
    w: p.node.size[0] * c + p.node.size[1] * s + GAP,
    h: p.node.size[0] * s + p.node.size[1] * c + GAP,
  }
}

function measure(placed, halfW, halfH) {
  let overlapTotal = 0
  let maxPair = 0
  let offBoard = 0
  const boxes = placed.map(boundsOf)
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const o = rectOverlap(boxes[i], boxes[j])
      if (o <= 0) continue
      overlapTotal += o
      maxPair = Math.max(maxPair, o / Math.min(boxes[i].w * boxes[i].h, boxes[j].w * boxes[j].h))
    }
  }
  for (const b of boxes) {
    if (Math.abs(b.x) + b.w / 2 > halfW + 0.01 || Math.abs(b.y) + b.h / 2 > halfH + 0.01) offBoard += 1
  }
  return { overlapTotal, maxPair, offBoard }
}

function attempt(caseModel, seed, innerW, innerH) {
  const rng = createRng(`${seed}:${caseModel.id}`)
  const halfW = innerW / 2
  const halfH = innerH / 2

  const placed = []
  const put = (node, x, y, rot) => {
    const p = { node, x, y, rotation: rot, layer: 0 }
    placed.push(p)
    return p
  }

  const root = caseModel.root
  put(root, 0, 0, rng.jitter(0.012))

  const branches = caseModel.branches
  const n = Math.max(branches.length, 1)
  const angle0 = rng.range(0, Math.PI * 2)
  // 分支环至少要绕开 root，否则松弛得从深度重叠里往外爬
  const rootClear = Math.hypot(root.size[0], root.size[1]) * 0.62

  branches.forEach((b, i) => {
    const a = angle0 + (i / n) * Math.PI * 2 + rng.jitter(Math.PI / (n * 2.6))
    const clear = rootClear + Math.hypot(b.size[0], b.size[1]) * 0.55
    const rx = Math.max(halfW * rng.range(0.36, 0.48), clear)
    const ry = Math.max(halfH * rng.range(0.40, 0.56), clear * 0.72)
    const p = put(b, Math.cos(a) * rx, Math.sin(a) * ry, rng.jitter(MAX_TILT))
    p.angle = a

    b.children.forEach((kid, j) => {
      const spread = b.children.length === 1 ? 0 : (j / (b.children.length - 1) - 0.5)
      const ka = a + spread * rng.range(1.0, 1.6) + rng.jitter(0.2)
      const dist =
        (Math.hypot(b.size[0], b.size[1]) + Math.hypot(kid.size[0], kid.size[1])) * 0.5 *
        rng.range(1.0, 1.35)
      put(kid, p.x + Math.cos(ka) * dist, p.y + Math.sin(ka) * dist * 0.85, rng.jitter(MAX_TILT))
    })
  })

  const clampInside = (p) => {
    if (p.node.level === 0) { p.x = 0; p.y = 0; return }
    const b = boundsOf(p)
    const lx = Math.max(0, halfW - b.w / 2 - EDGE_MARGIN)
    const ly = Math.max(0, halfH - b.h / 2 - EDGE_MARGIN)
    p.x = Math.max(-lx, Math.min(lx, p.x))
    p.y = Math.max(-ly, Math.min(ly, p.y))
  }

  // 先把所有人钳进板内。只在碰撞时钳制的话，
  // 一张初始就被甩到板外、又恰好没邻居的卡会一直留在外面。
  for (const p of placed) clampInside(p)

  // O(n²) × 迭代数。规模大了要收敛迭代次数，否则百来张卡要跑掉半秒。
  const ITER = Math.max(300, Math.min(800, Math.round(18000 / placed.length)))
  for (let it = 0; it < ITER; it += 1) {
    const strength = 0.5 + 0.5 * (1 - it / ITER)

    // Gauss-Seidel：读到的永远是最新位置
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = boundsOf(placed[i])
        const b = boundsOf(placed[j])
        const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x)
        const oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y)
        if (ox <= 0 || oy <= 0) continue

        // 沿穿透最浅的轴推开，位移最小
        const alongX = ox < oy
        const push = (alongX ? ox : oy) * strength
        const dir = alongX
          ? (a.x <= b.x ? -1 : 1)
          : (a.y <= b.y ? -1 : 1)

        // root 不动，让别人绕开它
        const wi = placed[i].node.level === 0 ? 0 : 1
        const wj = placed[j].node.level === 0 ? 0 : 1
        const total = wi + wj
        if (total === 0) continue
        const si = (push * wi) / total
        const sj = (push * wj) / total

        if (alongX) { placed[i].x += dir * si; placed[j].x -= dir * sj }
        else { placed[i].y += dir * si; placed[j].y -= dir * sj }

        clampInside(placed[i])
        clampInside(placed[j])
      }
    }
  }

  for (const p of placed) clampInside(p)

  // 反对齐：y 太接近的错开一点，别看起来像表格
  const sorted = placed.filter((p) => p.node.level > 0).sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i += 1) {
    if (Math.abs(sorted[i].y - sorted[i - 1].y) >= 0.12) continue
    const save = sorted[i].y
    sorted[i].y += rng.range(0.18, 0.4) * (rng.bool() ? 1 : -1)
    clampInside(sorted[i])
    // 错开如果制造了新的重叠就撤销
    const b = boundsOf(sorted[i])
    const hit = placed.some((o) => o !== sorted[i] && rectOverlap(b, boundsOf(o)) > 0)
    if (hit) { sorted[i].y = save; clampInside(sorted[i]) }
  }

  return { placed, metrics: measure(placed, halfW, halfH), halfW, halfH }
}

export function solveLayout(caseModel, { seed, scale }) {
  const nodes = caseModel.nodes
  const contentArea = nodes.reduce((s, n) => s + area(n), 0)

  // 板子下限跟内容走。写死一个下限的话，只有几张卡时板会空得离谱
  // （覆盖率掉到 0.1 以下，看着像忘了放东西）。
  // 至少要塞得下：root + 两侧各一张最大的卡。
  // root 在中心不占环上的位置，算下限时要排除，否则板会被它撑大一圈
  const ring = nodes.filter((n) => n.level > 0)
  const widest = ring.length
    ? Math.max(...ring.map((n) => Math.hypot(n.size[0], n.size[1])))
    : Math.hypot(...caseModel.root.size)
  const floorW = Math.max(14, caseModel.root.size[0] + widest * 2 + 1.5)

  // 先在同一尺寸下换几个种子——密一点更好看。
  // 都排不开才放大板子，宁可空一点也不要糊成一团。
  let best = null
  const trail = []
  // 密板（卡片被 densityScale 缩过）拓扑更难塞紧：
  // 同尺寸多试几个种子，比直接放大板子换来的覆盖率划算
  const seedsPerSize = nodes.length > 30 ? 6 : SEEDS_PER_SIZE

  outer:
  for (const grow of SIZE_STEPS) {
    const innerArea = (contentArea / TARGET_COVERAGE) * scale * scale * grow * grow
    let innerH = Math.sqrt(innerArea / ASPECT)
    let innerW = Math.min(Math.max(innerH * ASPECT, floorW), 130)
    innerH = innerW / ASPECT

    let sizeBest = null
    for (let k = 0; k < seedsPerSize; k += 1) {
      const run = attempt(caseModel, `${seed}#${grow.toFixed(2)}#${k}`, innerW, innerH)
      const candidate = { ...run, innerW, innerH }
      if (!sizeBest || run.metrics.maxPair < sizeBest.metrics.maxPair) sizeBest = candidate
      if (run.metrics.maxPair <= OVERLAP_BUDGET && run.metrics.offBoard === 0) {
        trail.push(`${innerW.toFixed(0)}x${innerH.toFixed(0)}#${k}=${run.metrics.maxPair.toFixed(3)}✓`)
        best = candidate
        break outer
      }
    }
    trail.push(`${innerW.toFixed(0)}x${innerH.toFixed(0)}=${sizeBest.metrics.maxPair.toFixed(3)}`)
    if (!best || sizeBest.metrics.maxPair < best.metrics.maxPair) best = sizeBest
  }

  const { placed, metrics, innerW, innerH } = best
  const board = {
    liner: { w: innerW, h: innerH },
    cork: { w: innerW + BOARD.innerInset * 2, h: innerH + BOARD.innerInset * 2 },
  }
  board.outer = {
    w: board.cork.w + BOARD.frameThickness * 2,
    h: board.cork.h + BOARD.frameThickness * 2,
  }

  // 离中心远的压在上面，看起来像后钉上去的
  const ordered = placed.slice().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
  ordered.forEach((p, i) => {
    p.layer = i
    p.z = 0.4 + i * 0.006
  })

  const quadrants = new Set(placed.filter((p) => p.node.level > 0)
    .map((p) => `${p.x >= 0 ? 'r' : 'l'}${p.y >= 0 ? 't' : 'b'}`))

  return {
    board,
    placements: placed,
    byId: new Map(placed.map((p) => [p.node.id, p])),
    diagnostics: {
      pieceCount: placed.length,
      coverageRatio: +(contentArea / (innerW * innerH)).toFixed(4),
      overlapRatio: +(metrics.overlapTotal / (innerW * innerH)).toFixed(4),
      maxPairOverlap: +metrics.maxPair.toFixed(4),
      occupiedQuadrants: quadrants.size,
      offBoardPieces: metrics.offBoard,
      boardSize: `${innerW.toFixed(1)}x${innerH.toFixed(1)}`,
      layoutAttempts: trail.join(' → '),
    },
  }
}
