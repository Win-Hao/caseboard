// Canvas 文字排版。必须同时处理拉丁文（按词断）和 CJK（按字断）。

const CJK = /[ᄀ-ᇿ⺀-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-｠￠-￦]/
const NO_LEAD = /^[、。，．！？；：）」』】〉》〕｝，.!?;:)\]}%'"·…－—～]/
const NO_TRAIL = /[（「『【〈《〔｛([{'"]$/

const isCJK = (ch) => CJK.test(ch)

/** 切成不可再分的排版单元：CJK 单字，拉丁整词（含尾随空格）。 */
export function segment(text) {
  const out = []
  let buf = ''
  for (const ch of String(text ?? '')) {
    if (isCJK(ch)) {
      if (buf) { out.push(buf); buf = '' }
      out.push(ch)
    } else if (ch === '\n') {
      if (buf) { out.push(buf); buf = '' }
      out.push('\n')
    } else if (ch === ' ') {
      buf += ch
      out.push(buf); buf = ''
    } else {
      buf += ch
    }
  }
  if (buf) out.push(buf)
  return out
}

/**
 * 折行。返回 { lines, truncated }。
 * maxLines 为 0 表示不限行数。
 */
export function wrap(ctx, text, maxWidth, maxLines = 0) {
  const units = segment(text)
  const lines = []
  let line = ''
  let truncated = false

  const push = () => {
    if (line !== '') lines.push(line.trimEnd())
    line = ''
  }

  for (let i = 0; i < units.length; i += 1) {
    const u = units[i]
    if (u === '\n') { push(); continue }

    const candidate = line + u
    if (line !== '' && ctx.measureText(candidate).width > maxWidth) {
      // 避头尾：行首禁则字符拉回上一行
      if (NO_LEAD.test(u) && line.length > 1) {
        lines.push((line + u).trimEnd())
        line = ''
        continue
      }
      // 行尾禁则：把上一个单元推到下一行
      if (NO_TRAIL.test(line.trimEnd())) {
        const trimmed = line.trimEnd()
        const last = trimmed.slice(-1)
        lines.push(trimmed.slice(0, -1).trimEnd())
        line = last + u
        continue
      }
      push()
      line = u
    } else {
      line = candidate
    }

    if (maxLines && lines.length >= maxLines) {
      truncated = i < units.length - 1
      break
    }
  }
  if (line !== '' && (!maxLines || lines.length < maxLines)) push()

  if (maxLines && lines.length > maxLines) {
    lines.length = maxLines
    truncated = true
  }
  if (truncated && lines.length) {
    // 省略号：退字直到装得下
    let last = lines[lines.length - 1]
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = last + '…'
  }
  return { lines, truncated }
}

/** 画折行文本，返回 { bottom, truncated, lineCount }。 */
export function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 0) {
  const { lines, truncated } = wrap(ctx, text, maxWidth, maxLines)
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
  return { bottom: y + lines.length * lineHeight, truncated, lineCount: lines.length }
}

/** 单行，超出用省略号。返回 truncated。 */
export function drawClipped(ctx, text, x, y, maxWidth) {
  let s = String(text ?? '')
  if (ctx.measureText(s).width <= maxWidth) { ctx.fillText(s, x, y); return false }
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1)
  ctx.fillText(s + '…', x, y)
  return true
}

/** contain 适配：把 source 等比放进 box。 */
export function containFit(source, box) {
  const s = Math.min(box.width / source.width, box.height / source.height)
  const w = source.width * s
  const h = source.height * s
  return { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h }
}
