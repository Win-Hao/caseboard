// 卡片注册表。
//
// 新增一种卡片 = 在这个目录里加一个文件 + 在下面这个数组里加一行。
// 其他地方（布局、材质、五金、面板、搜索）会自动认得它。
// 完整步骤见 references/contributing-a-card.md。

import dossier from './dossier.js'
import excerpt from './excerpt.js'
import note from './note.js'
import quote from './quote.js'
import stamp from './stamp.js'
import photo from './photo.js'
import clipping from './clipping.js'
import blueprint from './blueprint.js'
import { EDGES } from '../scene/geometry.js'
import ledger from './ledger.js'
import indexCard from './index-card.js'
import telegram from './telegram.js'
import chart from './chart.js'
import timeline from './timeline.js'
import memo from './memo.js'
import sticky from './sticky.js'
import ticket from './ticket.js'

export const CARDS = [
  dossier,
  excerpt,
  note,
  quote,
  stamp,
  photo,
  clipping,
  blueprint,
  ledger,
  indexCard,
  telegram,
  chart,
  timeline,
  memo,
  sticky,
  ticket,
]

export const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]))

/** 启动时自检，缺字段早点炸掉，别等到渲染出一张白卡才发现。 */
const REQUIRED = ['id', 'label', 'labelEn', 'stock', 'ink', 'rule', 'edge', 'surface', 'hardware', 'size', 'texture', 'paint']
for (const c of CARDS) {
  const missing = REQUIRED.filter((k) => c[k] === undefined)
  if (missing.length) throw new Error(`卡片 "${c.id ?? '(无 id)'}" 缺少字段: ${missing.join(', ')}`)
  if (typeof c.paint !== 'function') throw new Error(`卡片 "${c.id}" 的 paint 不是函数`)
  if (!EDGES.includes(c.edge)) throw new Error(`卡片 "${c.id}" 的 edge 不认识: ${c.edge}（可选 ${EDGES.join(' | ')}）`)
  if (!['pin', 'tape', 'clip', 'staple', 'none'].includes(c.hardware)) throw new Error(`卡片 "${c.id}" 的 hardware 不认识: ${c.hardware}`)
}
if (CARD_BY_ID.size !== CARDS.length) throw new Error('卡片 id 有重复')
