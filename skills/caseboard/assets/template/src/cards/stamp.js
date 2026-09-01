import { font, header, factList, drawWrapped, track } from './helpers.js'

export default {
  id: 'stamp',
  label: '规格', labelEn: 'SPEC',
  stock: '#e0d9c2', ink: '#1f1b14', rule: '#918876',
  edge: 'clean', surface: 'paper', hardware: 'staple',
  size: [3.6, 2.6], texture: [780, 560],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 780
    const pad = 54 * s
    const y = header(ctx, node, w, pad, s, accent)

    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 33 * s)
    const r = drawWrapped(ctx, node.summary, pad, y + 62 * s, w - pad * 2 - 60 * s, 44 * s, 2)
    track(r)
    factList(ctx, node, pad, r.bottom + 32 * s, w - pad * 2, s, accent, h - pad * 0.6)

    // 盖章
    ctx.save()
    ctx.translate(w - 92 * s, h - 88 * s)
    ctx.rotate(-0.24)
    ctx.globalAlpha = 0.42
    ctx.strokeStyle = accent
    ctx.lineWidth = 6 * s
    ctx.beginPath()
    ctx.arc(0, 0, 62 * s, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = accent
    ctx.font = font(700, 25 * s)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ON FILE', 0, 0)
    ctx.restore()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  },
}
