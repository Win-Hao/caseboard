import { font, header, drawWrapped, track } from './helpers.js'

export default {
  id: 'excerpt',
  label: '摘录', labelEn: 'EXCERPT',
  stock: '#ded4b9', ink: '#221e16', rule: '#968c74',
  edge: 'ripped', surface: 'paper', hardware: 'tape',
  size: [4.2, 2.5], texture: [900, 540],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 900
    const pad = 58 * s
    const y = header(ctx, node, w, pad, s, accent)
    ctx.fillStyle = accent
    ctx.fillRect(pad, y + 18 * s, 118 * s, 6 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 35 * s)
    track(drawWrapped(ctx, node.summary, pad, y + 76 * s, w - pad * 2, 47 * s, 4))
  },
}
