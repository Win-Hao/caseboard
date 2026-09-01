import { font, drawWrapped, wrap, track, noteTruncation } from './helpers.js'

export default {
  id: 'clipping',
  label: '剪报', labelEn: 'CLIPPING',
  stock: '#d8cba9', ink: '#221d15', rule: '#8f856c',
  edge: 'ripped', surface: 'thin', hardware: 'pin',
  size: [3.8, 2.4], texture: [820, 520],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 820
    const pad = 46 * s
    ctx.fillStyle = 'rgba(30,26,18,0.62)'
    ctx.font = font(400, 23 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 22 * s)
    ctx.strokeStyle = 'rgba(30,26,18,0.45)'
    ctx.lineWidth = 2 * s
    ctx.beginPath()
    ctx.moveTo(pad, pad + 38 * s)
    ctx.lineTo(w - pad, pad + 38 * s)
    ctx.stroke()

    ctx.fillStyle = node.spec.ink
    ctx.font = font(700, 58 * s)
    const t = drawWrapped(ctx, node.title, pad, pad + 106 * s, w - pad * 2, 66 * s, 2)
    track(t)

    // 双栏
    const colW = (w - pad * 2 - 26 * s) / 2
    ctx.font = font(400, 26 * s)
    ctx.fillStyle = 'rgba(30,26,18,0.92)'
    const lines = wrap(ctx, node.summary, colW, 10).lines
    const half = Math.ceil(lines.length / 2)
    const maxRows = Math.floor((h - t.bottom - 26 * s - pad) / (35 * s))
    if (half > maxRows) noteTruncation()
    lines.slice(0, half).slice(0, maxRows)
      .forEach((l, i) => ctx.fillText(l, pad, t.bottom + 30 * s + i * 35 * s))
    lines.slice(half).slice(0, maxRows)
      .forEach((l, i) => ctx.fillText(l, pad + colW + 26 * s, t.bottom + 30 * s + i * 35 * s))
  },
}
