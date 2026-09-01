// 内部备忘录。FROM / TO / RE 抬头块 + 双线 + 正文。
// 这套排版自带"官方口径"的语气，适合放立场、声明、规定。

import { font, drawWrapped, drawClipped, track } from './helpers.js'

export default {
  id: 'memo',
  label: '备忘录', labelEn: 'MEMO',
  stock: '#e2dac4', ink: '#1e1b14', rule: '#8d8672',
  edge: 'deckle', surface: 'paper', hardware: 'clip',
  size: [4.0, 2.6], texture: [860, 560],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 860
    const pad = 54 * s

    ctx.fillStyle = node.spec.ink
    ctx.font = font(700, 34 * s)
    ctx.letterSpacing = `${6 * s}px`
    ctx.fillText('MEMORANDUM', pad, pad + 34 * s)
    ctx.letterSpacing = '0px'

    ctx.strokeStyle = node.spec.ink
    ctx.lineWidth = 2.5 * s
    for (const off of [0, 6 * s]) {
      ctx.beginPath()
      ctx.moveTo(pad, pad + 56 * s + off); ctx.lineTo(w - pad, pad + 56 * s + off)
      ctx.stroke()
    }

    // 抬头块
    const rows = [['RE', node.title], ['RE 类型', node.kicker]]
    let y = pad + 108 * s
    ctx.font = font(700, 21 * s)
    for (const [k, v] of rows.slice(0, 1)) {
      ctx.fillStyle = accent
      ctx.fillText(k, pad, y)
      ctx.fillStyle = node.spec.ink
      ctx.font = font(600, 40 * s)
      track({ truncated: drawClipped(ctx, v, pad + 76 * s, y + 4 * s, w - pad * 2 - 76 * s) })
      ctx.font = font(700, 21 * s)
      y += 52 * s
    }
    ctx.fillStyle = accent
    ctx.fillText('类型', pad, y)
    ctx.fillStyle = 'rgba(30,27,20,0.75)'
    ctx.font = font(400, 24 * s)
    drawClipped(ctx, node.kicker, pad + 76 * s, y, w - pad * 2 - 76 * s)
    y += 22 * s

    ctx.strokeStyle = 'rgba(30,27,20,0.35)'
    ctx.lineWidth = 1.6 * s
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke()

    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 29 * s)
    const b = drawWrapped(ctx, node.summary, pad, y + 50 * s, w - pad * 2, 40 * s, 3)
    track(b)

    // 签名线
    ctx.strokeStyle = 'rgba(30,27,20,0.4)'
    ctx.lineWidth = 1.8 * s
    ctx.beginPath()
    ctx.moveTo(w - pad - 200 * s, h - pad * 0.7); ctx.lineTo(w - pad, h - pad * 0.7)
    ctx.stroke()
  },
}
