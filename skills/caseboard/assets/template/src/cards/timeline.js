// 年表。横轴 + 刻度，facts 的 label 当时间点、value 当发生了什么。
// 上下交错排，否则相邻两条会撞在一起。

import { font, drawWrapped, wrap, track, noteTruncation } from './helpers.js'

export default {
  id: 'timeline',
  label: '年表', labelEn: 'TIMELINE',
  stock: '#d9d1b9', ink: '#1d1a13', rule: '#89826f',
  edge: 'deckle', surface: 'paper', hardware: 'staple',
  size: [4.9, 2.2], texture: [1020, 460],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 1020
    const pad = 52 * s

    ctx.fillStyle = accent
    ctx.font = font(700, 23 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 23 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 50 * s)
    track(drawWrapped(ctx, node.title, pad, pad + 84 * s, w - pad * 2, 56 * s, 1))

    const rows = node.facts
    const axisY = h * 0.62
    const left = pad
    const right = w - pad

    // 轴
    ctx.strokeStyle = 'rgba(29,26,19,0.55)'
    ctx.lineWidth = 3 * s
    ctx.beginPath(); ctx.moveTo(left, axisY); ctx.lineTo(right, axisY); ctx.stroke()
    // 箭头
    ctx.beginPath()
    ctx.moveTo(right, axisY); ctx.lineTo(right - 14 * s, axisY - 8 * s)
    ctx.moveTo(right, axisY); ctx.lineTo(right - 14 * s, axisY + 8 * s)
    ctx.stroke()

    if (rows.length === 0) return
    const span = right - left - 40 * s
    const gap = rows.length === 1 ? 0 : span / (rows.length - 1)

    rows.forEach((f, i) => {
      const x = left + 20 * s + gap * i
      const up = i % 2 === 0

      ctx.strokeStyle = 'rgba(29,26,19,0.45)'
      ctx.lineWidth = 2 * s
      ctx.beginPath()
      ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + (up ? -26 * s : 26 * s))
      ctx.stroke()

      ctx.fillStyle = accent
      ctx.beginPath(); ctx.arc(x, axisY, 8 * s, 0, Math.PI * 2); ctx.fill()

      ctx.textAlign = 'center'
      ctx.fillStyle = accent
      ctx.font = font(700, 23 * s)
      ctx.fillText(f.label, x, axisY + (up ? -36 * s : 58 * s))

      ctx.fillStyle = 'rgba(29,26,19,0.85)'
      ctx.font = font(400, 21 * s)
      const cellW = Math.max(gap * 0.92, 120 * s)
      const lines = wrap(ctx, f.value, cellW, 2)
      if (lines.truncated) noteTruncation()
      lines.lines.forEach((l, k) => {
        ctx.fillText(l, x, axisY + (up ? -66 * s : 86 * s) + k * (up ? -26 * s : 26 * s))
      })
      ctx.textAlign = 'left'
    })
  },
}
