import { font, header, factList, drawWrapped, track } from './helpers.js'

export default {
  id: 'dossier',
  label: '档案', labelEn: 'FILE',
  stock: '#d6c9a8', ink: '#1e1a13', rule: '#8d8064',
  edge: 'clean', surface: 'paper', hardware: 'clip',
  size: [4.6, 3.3], texture: [960, 690],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 960
    const pad = 64 * s
    const y = header(ctx, node, w, pad, s, accent)

    ctx.strokeStyle = node.spec.rule
    ctx.lineWidth = 3 * s
    ctx.strokeRect(pad, y + 20 * s, w - pad * 2, h - y - 20 * s - pad)

    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 35 * s)
    const inner = pad + 30 * s
    const bodyW = w - inner * 2
    const r = drawWrapped(ctx, node.summary, inner, y + 82 * s, bodyW, 47 * s, 3)
    track(r)
    factList(ctx, node, inner, r.bottom + 34 * s, bodyW, s, accent, h - pad)
  },
}
