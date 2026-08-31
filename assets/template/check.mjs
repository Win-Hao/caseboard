// 不开浏览器的验证。用法：npm run check
//
// 覆盖布局、结构、图片路径。文字溢出需要 canvas 的文字测量，
// Node 里做不了——那一项只能靠 npm run dev 之后看控制台，脚本会提示。
//
// 退出码 0 = 合格，1 = 有问题。可以直接接 CI 或者让 agent 读退出码。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildModel } from './src/core/model.js'
import { solveLayout } from './src/core/layout.js'

const here = dirname(fileURLToPath(import.meta.url))
const dataPath = join(here, 'data/board.json')

const LIMITS = {
  coverageMin: 0.30,
  coverageMax: 0.68,
  maxPairOverlap: 0.15,
}

let failed = 0
const bad = (msg) => { failed += 1; console.log(`  ✗ ${msg}`) }
const good = (msg) => console.log(`  ✓ ${msg}`)

let data
try {
  data = JSON.parse(readFileSync(dataPath, 'utf8'))
} catch (e) {
  console.error(`data/board.json 读不了或不是合法 JSON：\n${e.message}`)
  process.exit(1)
}

let model
try {
  model = buildModel(data)
} catch (e) {
  console.error(`data/board.json 结构有问题：\n${e.message}`)
  process.exit(1)
}

console.log(`\n${model.title}${model.subtitle ? ' · ' + model.subtitle : ''}`)
console.log(`语言 ${model.locale} · 种子 ${model.layout.seed} · ${model.cases.length} 个案卷\n`)

if (model.warnings.length) {
  console.log('结构警告')
  for (const w of model.warnings) bad(w)
  console.log('')
}

for (const c of model.cases) {
  console.log(`案卷 ${c.id}（${c.label}）`)
  const d = solveLayout(c, model.layout).diagnostics

  const line = (label, value, ok, hint) => {
    const text = `${label} ${value}`
    if (ok) good(text)
    else bad(`${text}  → ${hint}`)
  }

  line('覆盖率', d.coverageRatio,
    d.coverageRatio >= LIMITS.coverageMin && d.coverageRatio <= LIMITS.coverageMax,
    d.coverageRatio < LIMITS.coverageMin ? '太空，加 L2 节点' : '太挤，减节点或调大 layout.scale')
  line('最大重叠', d.maxPairOverlap, d.maxPairOverlap < LIMITS.maxPairOverlap,
    '换个 layout.seed 重排，或减节点')
  line('出界卡片', d.offBoardPieces, d.offBoardPieces === 0, '调大 layout.scale')
  if (d.pieceCount >= 10) {
    line('占用象限', `${d.occupiedQuadrants}/4`, d.occupiedQuadrants === 4, '分布不均，检查 L1 数量')
  }
  console.log(`  · ${d.pieceCount} 张卡 · 板面 ${d.boardSize} · 求解 ${d.layoutAttempts}`)

  // 红线连通性：每张非 root 卡都该挂在树上
  const linked = new Set()
  for (const b of c.branches) { linked.add(b.id); for (const l of b.children) linked.add(l.id) }
  const orphans = c.nodes.filter((n) => n.level > 0 && !linked.has(n.id)).map((n) => n.id)
  line('无连线卡片', orphans.length, orphans.length === 0, `${orphans.join(', ')} 的 parent 有问题`)

  // 图片路径：这一项浏览器里只能等加载失败才知道，Node 里可以提前查
  const missing = c.nodes
    .filter((n) => n.image)
    .filter((n) => !existsSync(join(here, 'public', n.image.replace(/^\//, ''))))
    .map((n) => `${n.id} → ${n.image}`)
  if (missing.length) bad(`图片找不到：${missing.join(' / ')}`)
  else if (c.nodes.some((n) => n.image)) good('图片路径全部存在')

  console.log('')
}

console.log('文字溢出这一项 Node 里查不了（需要 canvas 的文字测量）。')
console.log('跑 npm run dev，控制台会打出 [board] 排版合格 或 [board] 排版待改进。\n')

if (failed) {
  console.log(`${failed} 项不达标。改 data/board.json 后重跑。\n`)
  process.exit(1)
}
console.log('布局与结构全部合格。\n')
