import { font, drawWrapped, drawClipped, track } from './helpers.js'

export default {
  id: 'quote',
  label: '引语', labelEn: 'QUOTE',
  stock: '#cbb583', ink: '#241d12', rule: '#8b784f',
  edge: 'ripped', surface: 'card', hardware: 'tape',
  size: [3.9, 2.3], texture: [840, 500],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 840
    const pad = 62 * s
    ctx.fillStyle = accent
    ctx.font = font(700, 116 * s)
    ctx.fillText('“', pad - 10 * s, pad + 78 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 40 * s)
    const q = drawWrapped(ctx, node.summary, pad, pad + 124 * s, w - pad * 2, 53 * s, 3)
    track(q)
    ctx.fillStyle = accent
    ctx.font = font(700, 27 * s)
    drawClipped(ctx, `— ${node.title}`, pad, Math.min(q.bottom + 44 * s, h - pad), w - pad * 2)
  },
}
