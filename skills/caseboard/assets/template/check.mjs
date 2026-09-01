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
  const scaleNote = c.densityScale < 1 ? ` · 卡片缩放 ×${c.densityScale}` : ''
  console.log(`  · ${d.pieceCount} 张卡 · 板面 ${d.boardSize}${scaleNote} · 求解 ${d.layoutAttempts}`)

  // 红线连通性：每张非 root 卡都该挂在树上
  const linked = new Set()
  ;(function walk(n) { for (const ch of n.children) { linked.add(ch.id); walk(ch) } })(c.root)
  const orphans = c.nodes.filter((n) => n.level > 0 && !linked.has(n.id)).map((n) => n.id)
  line('无连线卡片', orphans.length, orphans.length === 0, `${orphans.join(', ')} 的 parent 有问题`)

  // 文字长度启发式：canvas 的精确测量只能在浏览器做，但按「CJK 记 2、其余记 1」
  // 估宽已能拦住绝大多数溢出。上限对应 schema 的承诺：
  // kicker 8 中文（估宽 16）、title 20 中文/30 英文（40）、summary 30 中文/60 英文（60）。
  const weight = (s) => [...(s || '')].reduce(
    (n, ch) => n + (/[⺀-鿿가-힣＀-￯]/.test(ch) ? 2 : 1), 0)
  const CAPS = { kicker: 16, title: 40, summary: 60 }
  const overlong = []
  for (const n of c.nodes) {
    for (const [field, cap] of Object.entries(CAPS)) {
      const w = weight(n[field])
      if (w > cap) overlong.push(`${n.id}.${field} 估宽 ${w}/${cap}`)
    }
  }
  line('文字长度', overlong.length ? overlong.join('；') : '全部在限内', overlong.length === 0,
    '超长必溢出，缩短它（中文按 2 个字符宽计）')

  // 图片路径：这一项浏览器里只能等加载失败才知道，Node 里可以提前查
  const missing = c.nodes
    .filter((n) => n.image)
    .filter((n) => !existsSync(join(here, 'public', n.image.replace(/^\//, ''))))
    .map((n) => `${n.id} → ${n.image}`)
  if (missing.length) bad(`图片找不到：${missing.join(' / ')}`)
  else if (c.nodes.some((n) => n.image)) good('图片路径全部存在')

  console.log('')
}

console.log('文字长度是估算；canvas 精确测量的 textOverflows 以浏览器为准。')
console.log('跑 npm run dev，控制台会打出 [board] 排版合格 或 [board] 排版待改进。\n')

if (failed) {
  console.log(`${failed} 项不达标。改 data/board.json 后重跑。\n`)
  process.exit(1)
}
console.log('布局与结构全部合格。\n')
