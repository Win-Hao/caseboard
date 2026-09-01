// 卡片的物理属性与全局常量。
// 每种卡片长什么样定义在 src/cards/ 下，这里只做汇总和跨类型的共享参数。
// 尺寸单位是世界单位（板子内区约 44 × 23）。

import { CARDS } from '../cards/index.js'

export const SURFACE = {
  photo:  { roughness: 0.42, envMapIntensity: 0.62, bumpScale: 0.006, clearcoat: 0.10, physical: true },
  paper:  { roughness: 0.87, envMapIntensity: 0.36, bumpScale: 0.010, physical: false },
  thin:   { roughness: 0.92, envMapIntensity: 0.34, bumpScale: 0.012, physical: false },
  card:   { roughness: 0.84, envMapIntensity: 0.38, bumpScale: 0.014, physical: false },
}

/**
 * 卡片类型表，从 cards/ 注册表派生。
 * 想加一种新卡片不要动这里——在 src/cards/ 加个文件就行，
 * 步骤见 references/contributing-a-card.md。
 */
export const KINDS = Object.fromEntries(CARDS.map((c) => [c.id, c]))

export const DEFAULT_KIND = 'dossier'
export const ROOT_SIZE = [5.4, 6.0]

/**
 * 按层级缩放卡片尺寸。
 * 光靠 kind 区分层级是不可靠的——agent 完全可能给二级节点挑一个大卡片、
 * 给一级节点挑一张小便签，总览下层级就彻底看不出来了。
 * 乘一个跟层级绑定的系数，无论 kind 怎么选，主干永远比证据显眼。
 */
export const LEVEL_SCALE = { 0: 1, 1: 1.16, 2: 0.9 }

/** 任意层级的缩放。前三层查表，更深的按 0.85 逐级递减、0.55 封底——
    总览下仍分得出主次，字号不至于不可读。 */
export function levelScale(level) {
  if (level in LEVEL_SCALE) return LEVEL_SCALE[level]
  return Math.max(0.55, +(0.9 * 0.85 ** (level - 2)).toFixed(3))
}

export const PIN_COLORS = ['#b8232a', '#c9772a', '#2f6d8c', '#4d7a4a', '#d8b23a', '#7a4a86']

export const BOARD = {
  frameThickness: 0.92,
  frameDepth: 0.34,
  innerInset: 0.89,   // 木框内沿到软木边缘
  linerInset: 1.78,   // 内衬纸内缩
}

export function kindSpec(kind) {
  return KINDS[kind] ?? KINDS[DEFAULT_KIND]
}

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g

/**
 * 内容是中文还是英文。卡片没写 kicker 时要用对语言的默认标签——
 * 一块全英文的板上顶着「档案」两个字很出戏。
 */
export function detectLocale(text) {
  const s = String(text || '')
  if (!s) return 'zh'
  const cjk = (s.match(CJK) || []).length
  return cjk / s.length > 0.08 ? 'zh' : 'en'
}
