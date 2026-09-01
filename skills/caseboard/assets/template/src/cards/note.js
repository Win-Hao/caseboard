import { font, drawWrapped, track } from './helpers.js'

export default {
  id: 'note',
  label: '便签', labelEn: 'NOTE',
  stock: '#d2c8a3', ink: '#221d15', rule: '#8f8666',
  edge: 'torn-top', surface: 'thin', hardware: 'pin',
  size: [2.5, 2.2], texture: [560, 490],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 560
    const pad = 40 * s
    ctx.fillStyle = accent
    ctx.font = font(700, 24 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 24 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 48 * s)
    const t = drawWrapped(ctx, node.title, pad, pad + 86 * s, w - pad * 2, 56 * s, 2)
    track(t)
    ctx.font = font(400, 30 * s)
    ctx.fillStyle = 'rgba(30,26,18,0.9)'
    track(drawWrapped(ctx, node.summary, pad, t.bottom + 30 * s, w - pad * 2, 40 * s, 4))
  },
}
