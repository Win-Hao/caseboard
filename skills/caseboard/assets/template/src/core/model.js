// board.json → 归一化的场景模型。所有校验在这里做一次，下游不再防御。

import { kindSpec, DEFAULT_KIND, KINDS, ROOT_SIZE, LEVEL_SCALE, detectLocale } from './spec.js'
import { PLATE_NAMES } from '../cards/plates.js'
import { hashSeed } from './rng.js'

const warn = []
export const modelWarnings = () => warn.slice()

function clampArray(a, n) {
  if (!Array.isArray(a)) return []
  return a.slice(0, n)
}

function normalizeNode(raw, { level, caseId, index, locale }) {
  const kind = KINDS[raw.kind] ? raw.kind : DEFAULT_KIND
  if (raw.kind && !KINDS[raw.kind]) {
    warn.push(`节点 ${raw.id}: 未知 kind "${raw.kind}"，已回退到 ${DEFAULT_KIND}`)
  }
  const spec = kindSpec(kind)
  return {
    id: String(raw.id ?? `${caseId}-n${index}`),
    caseId,
    level,
    parent: raw.parent ?? null,
    kind,
    spec,
    kicker: raw.kicker ? String(raw.kicker) : (locale === 'en' ? spec.labelEn : spec.label),
    kindLabel: locale === 'en' ? spec.labelEn : spec.label,
    title: String(raw.title ?? '未命名'),
    summary: String(raw.summary ?? ''),
    detail: String(raw.detail ?? raw.summary ?? ''),
    facts: clampArray(raw.facts, 4).map((f) => ({
      label: String(f.label ?? ''), value: String(f.value ?? ''),
    })),
    bullets: clampArray(raw.bullets, 5).map(String),
    sources: clampArray(raw.sources, 4).map((s) => ({
      label: String(s.label ?? s.url ?? ''), url: String(s.url ?? ''),
    })),
    image: raw.image ? String(raw.image) : null,
    plate: raw.plate ? String(raw.plate) : null,   // 中心卡图版画法，见 cards/plates.js
    imageCaption: raw.imageCaption ? String(raw.imageCaption) : '',
    video: raw.video ? String(raw.video) : null,
    videoCaption: raw.videoCaption ? String(raw.videoCaption) : '',
    size: level === 0
      ? ROOT_SIZE.slice()
      : spec.size.map((v) => +(v * LEVEL_SCALE[level]).toFixed(3)),
    children: [],
  }
}

export function buildModel(data) {
  warn.length = 0
  if (!data || !Array.isArray(data.cases) || data.cases.length === 0) {
    throw new Error('board.json 缺少 cases 数组')
  }

  const cases = data.cases.map((raw, ci) => {
    const caseId = String(raw.id ?? `case-${ci}`)
    const accent = raw.accent ?? '#8c171d'

    if (!raw.root) throw new Error(`case "${caseId}" 缺少 root`)

    // 先探一遍这个 case 是中文还是英文，默认标签要跟着走
    const rawNodesAll = Array.isArray(raw.nodes) ? raw.nodes : []
    const locale = detectLocale(
      [raw.label, raw.root.title, raw.root.summary,
        ...rawNodesAll.slice(0, 12).flatMap((n) => [n.title, n.summary])].join(' '),
    )

    const root = normalizeNode({ ...raw.root, kind: raw.root.kind ?? 'photo' }, {
      level: 0, caseId, index: 0, locale,
    })
    root.id = `${caseId}:root`
    root.parent = null

    const rawNodes = rawNodesAll
    const seen = new Set([root.id])
    const byId = new Map()

    // 第一轮：level 1（parent 为空）
    const branches = []
    for (const [i, n] of rawNodes.entries()) {
      if (n.parent) continue
      const node = normalizeNode(n, { level: 1, caseId, index: i, locale })
      if (seen.has(node.id)) { warn.push(`重复 id "${node.id}"，已跳过`); continue }
      seen.add(node.id)
      byId.set(node.id, node)
      branches.push(node)
    }

    // 第二轮：level 2（parent 指向已存在的 level 1）
    const leaves = []
    for (const [i, n] of rawNodes.entries()) {
      if (!n.parent) continue
      let parent = byId.get(String(n.parent))
      // 只支持两层。parent 指向另一个 L2 的话，静默接受会造出一张
      // 既没有红线、也不在导航序列里的孤儿卡——改挂到祖父那一级。
      if (parent && parent.level === 2) {
        const grand = byId.get(String(parent.parent))
        warn.push(`节点 "${n.id}" 的 parent "${n.parent}" 本身是二级节点；只支持两层，已改挂到 "${grand ? grand.id : '主干'}"`)
        parent = grand
      }
      if (!parent) {
        warn.push(`节点 "${n.id}" 的 parent "${n.parent}" 不存在，已提升为主干分支`)
        const node = normalizeNode({ ...n, parent: null }, { level: 1, caseId, index: i, locale })
        if (seen.has(node.id)) continue
        seen.add(node.id); byId.set(node.id, node); branches.push(node)
        continue
      }
      const node = normalizeNode(n, { level: 2, caseId, index: i, locale })
      if (seen.has(node.id)) { warn.push(`重复 id "${node.id}"，已跳过`); continue }
      seen.add(node.id)
      node.parent = parent.id
      parent.children.push(node)
      byId.set(node.id, node)
      leaves.push(node)
    }

    root.children = branches
    for (const b of branches) b.parent = root.id

    const all = [root, ...branches, ...leaves]
    if (branches.length === 0) warn.push(`case "${caseId}" 没有主干分支，板子会很空`)
    else if (branches.length < 3) warn.push(`case "${caseId}" 只有 ${branches.length} 个主干分支，层级感出不来（建议 3–7 个）`)
    // 这两种卡片整张版面都靠 facts 撑，缺了就是一张空卡
    for (const n of all) {
      if ((n.kind === 'chart' || n.kind === 'timeline') && n.facts.length === 0) {
        warn.push(`节点 "${n.id}" 用了 ${n.kind}，但没有 facts —— 这种卡片的版面全靠 facts，会画成空的`)
      }
    }

    if (all.length < 10) warn.push(`case "${caseId}" 只有 ${all.length} 个节点，板面会明显空旷（建议 12–35 个）`)
    if (all.length > 38) warn.push(`case "${caseId}" 有 ${all.length} 个节点，板子会被撑得很大、总览下读不清（建议拆成多个 case）`)

    return {
      id: caseId,
      locale,
      label: String(raw.label ?? caseId),
      accent,
      root,
      branches,
      leaves,
      nodes: all,
      byId: new Map(all.map((n) => [n.id, n])),
      // 阅读顺序：root → L1 → 该 L1 的 L2 → 下一个 L1 …
      order: [root, ...branches.flatMap((b) => [b, ...b.children])],
    }
  })

  // 中心卡图版：同一份图集里的各个案卷必须各不相同。
  // 让每张卡自己按种子随机挑的话，两个案卷有 1/6 的概率撞成一样，
  // 切过去会以为没切动。所以在这里统一发牌。
  const offset = hashSeed(String(data.layout?.seed ?? 'board-v1')) % PLATE_NAMES.length
  cases.forEach((c, i) => {
    if (!c.root.plate) c.root.plate = PLATE_NAMES[(offset + i) % PLATE_NAMES.length]
  })

  // 图集级语言：多数 case 是哪种就用哪种
  const zhCount = cases.filter((c) => c.locale === 'zh').length
  const locale = zhCount * 2 >= cases.length ? 'zh' : 'en'

  return {
    locale,
    title: String(data.title ?? 'Knowledge Corkboard'),
    subtitle: data.subtitle ? String(data.subtitle) : '',
    layout: {
      seed: String(data.layout?.seed ?? 'board-v1'),
      scale: Number(data.layout?.scale ?? 1) || 1,
    },
    cases,
    caseById: new Map(cases.map((c) => [c.id, c])),
    warnings: warn.slice(),
  }
}
