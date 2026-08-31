// 卡片绘制的共享工具。写新卡片只需要从这里取，不用碰别的文件。

import { drawWrapped, drawClipped, wrap, containFit } from '../core/text.js'

export { drawWrapped, drawClipped, wrap, containFit }

const FONT = '"Courier Prime", "Songti SC", "SimSun", serif'

/** 统一字体栈。所有卡片必须走这个函数，别自己拼字符串。 */
export const font = (weight, size) => `${weight} ${size}px ${FONT}`

/* ── 溢出诊断 ─────────────────────────────────────────────────
   每次绘制的溢出/截断次数会被汇总进 texture.paintDiagnostics，
   最终出现在 window.__BOARD__.diagnostics() 里。
   卡片里凡是可能截断文字的地方，都要 track() 一下，
   否则排版出问题时诊断是绿的，等于骗人。 */

const D = { overflows: 0, truncations: 0 }

export function resetDiagnostics() {
  D.overflows = 0
  D.truncations = 0
}
export function readDiagnostics() {
  return { textOverflows: D.overflows, textTruncations: D.truncations }
}
/** 传入 drawWrapped/wrap 的返回值，或 { truncated: boolean }。 */
export function track(result) {
  if (result && result.truncated) {
    D.overflows += 1
    D.truncations += 1
  }
  return result
}
/** 放不下内容时直接记一笔，不涉及具体文字。 */
export function noteTruncation() {
  D.truncations += 1
}

/* ── 通用版式片段 ─────────────────────────────────────────────── */

/**
 * 标准页眉：主色小标签 + 大标题。返回标题底部的 y。
 * scale 是相对参考尺寸的缩放系数，一般传 w / 参考宽度。
 */
export function header(ctx, node, w, pad, scale, accent) {
  ctx.fillStyle = accent
  ctx.font = font(700, 28 * scale)
  ctx.fillText(node.kicker.toUpperCase(), pad, pad + 28 * scale)

  ctx.fillStyle = node.spec.ink
  ctx.font = font(600, 68 * scale)
  const r = drawWrapped(ctx, node.title, pad, pad + 104 * scale, w - pad * 2, 76 * scale, 2)
  track(r)
  return r.bottom
}

/** facts 列表：主色小标签 + 值。放不下就停下并记一笔截断。 */
export function factList(ctx, node, x, y, w, scale, accent, maxY) {
  let cy = y
  for (const f of node.facts) {
    if (cy + 56 * scale > maxY) { noteTruncation(); break }
    ctx.fillStyle = accent
    ctx.font = font(700, 24 * scale)
    ctx.fillText(f.label, x, cy)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 32 * scale)
    drawClipped(ctx, f.value, x, cy + 38 * scale, w)
    cy += 80 * scale
  }
  return cy
}
