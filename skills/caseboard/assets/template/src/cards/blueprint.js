import { font, factList, drawWrapped, track } from './helpers.js'

export default {
  id: 'blueprint',
  label: '图纸', labelEn: 'DIAGRAM',
  stock: '#93a8ac', ink: '#0d1f24', rule: '#4f6b70',
  edge: 'clean', surface: 'card', hardware: 'clip',
  size: [4.4, 3.0], texture: [940, 640],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 940
    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 42 * s) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += 42 * s) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    const pad = 58 * s
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = font(700, 26 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 26 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 62 * s)
    const t = drawWrapped(ctx, node.title, pad, pad + 100 * s, w - pad * 2, 72 * s, 2)
    track(t)

    ctx.strokeStyle = 'rgba(13,31,36,0.55)'
    ctx.lineWidth = 3 * s
    ctx.strokeRect(pad, t.bottom + 16 * s, w - pad * 2, h - t.bottom - 16 * s - pad)
    ctx.fillStyle = 'rgba(13,31,36,0.94)'
    ctx.font = font(400, 33 * s)
    const r = drawWrapped(ctx, node.summary, pad + 26 * s, t.bottom + 76 * s, w - pad * 2 - 52 * s, 44 * s, 3)
    track(r)
    factList(ctx, node, pad + 26 * s, r.bottom + 30 * s, w - pad * 2 - 52 * s, s, 'rgba(13,31,36,0.8)', h - pad)
  },
}
