// 数据图。把 facts 里的数字画成条形，长度按比例。
//
// 只有 value 里能解析出数字的 fact 才画条；解析不出来的按普通行渲染。
// 不会拿随机数凑长度——一张骗人的图表比没有图表糟得多。

import { font, drawClipped, drawWrapped, track, noteTruncation } from './helpers.js'

/** 从 "18 – 22 %" 这类字符串里取第一个数字。取不到返回 null。 */
function firstNumber(text) {
  const m = String(text).replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export default {
  id: 'chart',
  label: '数据图', labelEn: 'CHART',
  stock: '#dcd5bf', ink: '#1c1a14', rule: '#8a8371',
  edge: 'clean', surface: 'paper', hardware: 'clip',
  size: [4.2, 3.0], texture: [900, 640],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 900
    const pad = 56 * s

    ctx.fillStyle = accent
    ctx.font = font(700, 25 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 25 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 56 * s)
    const t = drawWrapped(ctx, node.title, pad, pad + 92 * s, w - pad * 2, 62 * s, 1)
    track(t)

    ctx.font = font(400, 25 * s)
    ctx.fillStyle = 'rgba(28,26,20,0.82)'
    const sum = drawWrapped(ctx, node.summary, pad, t.bottom + 34 * s, w - pad * 2, 34 * s, 1)
    track(sum)

    // 版面高度画 6 条以内才可读；更多的留给焦点面板
    const rows = node.facts.slice(0, 6)
    if (rows.length === 0) return

    const top = sum.bottom + 26 * s
    const bottom = h - pad * 0.8
    const rowH = Math.min(64 * s, (bottom - top) / Math.max(rows.length, 1))
    const labelW = 250 * s
    const barX = pad + labelW
    const barMax = w - pad - barX

    const nums = rows.map((f) => firstNumber(f.value))
    const peak = Math.max(...nums.filter((n) => n !== null && n > 0), 0)

    // 基线
    ctx.strokeStyle = 'rgba(28,26,20,0.35)'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.moveTo(barX - 10 * s, top - 6 * s)
    ctx.lineTo(barX - 10 * s, top + rowH * rows.length)
    ctx.stroke()

    rows.forEach((f, i) => {
      const y = top + i * rowH
      if (y + rowH > bottom + 2 * s) { noteTruncation(); return }

      ctx.fillStyle = node.spec.ink
      ctx.font = font(400, 24 * s)
      track({ truncated: drawClipped(ctx, f.label, pad, y + rowH * 0.62, labelW - 18 * s) })

      const n = nums[i]
      if (n !== null && peak > 0) {
        const len = Math.max(6 * s, (Math.abs(n) / peak) * barMax * 0.72)
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.82
        ctx.fillRect(barX, y + rowH * 0.28, len, rowH * 0.4)
        ctx.globalAlpha = 1
        ctx.font = font(700, 24 * s)
        ctx.fillStyle = node.spec.ink
        drawClipped(ctx, f.value, barX + len + 12 * s, y + rowH * 0.62, barMax - len - 12 * s)
      } else {
        // 没有可用数字，老实按文字排，不画条
        ctx.font = font(400, 24 * s)
        ctx.fillStyle = 'rgba(28,26,20,0.7)'
        drawClipped(ctx, f.value, barX, y + rowH * 0.62, barMax)
      }
    })
  },
}
