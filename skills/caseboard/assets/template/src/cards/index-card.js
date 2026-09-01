// 索引卡。卡片盒式笔记的那种：顶部一条红线，下面横格，左上角一个打孔。
// 小尺寸，适合放术语定义和单条要点。

import { font, drawWrapped, drawClipped, track } from './helpers.js'

export default {
  id: 'index',
  label: '索引卡', labelEn: 'INDEX',
  stock: '#ded6c0', ink: '#1d1a14', rule: '#8b8471',
  edge: 'notched', surface: 'thin', hardware: 'pin',
  size: [3.0, 2.0], texture: [660, 440],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 660
    const pad = 48 * s
    const headY = 92 * s

    // 顶部红线，索引卡最醒目的特征
    ctx.strokeStyle = accent
    ctx.lineWidth = 3 * s
    ctx.beginPath()
    ctx.moveTo(0, headY); ctx.lineTo(w, headY)
    ctx.stroke()

    // 横格
    ctx.strokeStyle = 'rgba(90,110,130,0.28)'
    ctx.lineWidth = 1.4 * s
    for (let y = headY + 54 * s; y < h - 20 * s; y += 46 * s) {
      ctx.beginPath(); ctx.moveTo(pad * 0.6, y); ctx.lineTo(w - pad * 0.6, y); ctx.stroke()
    }

    // 左上打孔
    ctx.fillStyle = 'rgba(40,32,22,0.30)'
    ctx.beginPath(); ctx.arc(pad * 0.62, headY / 2, 15 * s, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,252,240,0.55)'
    ctx.beginPath(); ctx.arc(pad * 0.62 - 2 * s, headY / 2 - 2 * s, 13 * s, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = accent
    ctx.font = font(700, 21 * s)
    drawClipped(ctx, node.kicker.toUpperCase(), pad + 32 * s, headY - 26 * s, w - pad * 2 - 32 * s)

    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 46 * s)
    const t = drawWrapped(ctx, node.title, pad * 0.7, headY + 46 * s, w - pad * 1.4, 46 * s, 1)
    track(t)

    ctx.font = font(400, 26 * s)
    ctx.fillStyle = 'rgba(29,26,20,0.88)'
    track(drawWrapped(ctx, node.summary, pad * 0.7, headY + 92 * s, w - pad * 1.4, 46 * s, 4))
  },
}
