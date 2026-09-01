// 荧光便利贴。板上唯一一张"现代"的纸——饱和黄配卷角，
// 在一堆做旧纸里跳出来。适合放疑问、待办、临时想法这类
// "还没定论"的内容，视觉上就该和档案区分开。

import { font, drawWrapped, track } from './helpers.js'

export default {
  id: 'sticky',
  label: '便利贴', labelEn: 'STICKY',
  // 饱和黄。再浅就会被强光冲成白纸，这一档是试出来的下限。
  stock: '#cfb92f', ink: '#22200f', rule: '#9a8a24',
  edge: 'clean', surface: 'thin', hardware: 'none',
  size: [2.3, 2.3], texture: [520, 520],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 520
    const pad = 44 * s

    // 顶部胶条：略深一点的横带
    const glue = ctx.createLinearGradient(0, 0, 0, 56 * s)
    glue.addColorStop(0, 'rgba(140,120,20,0.20)')
    glue.addColorStop(1, 'rgba(140,120,20,0)')
    ctx.fillStyle = glue
    ctx.fillRect(0, 0, w, 56 * s)

    ctx.fillStyle = 'rgba(34,32,15,0.55)'
    ctx.font = font(700, 21 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 21 * s)

    ctx.fillStyle = node.spec.ink
    ctx.font = font(700, 44 * s)
    const t = drawWrapped(ctx, node.title, pad, pad + 82 * s, w - pad * 2, 52 * s, 2)
    track(t)

    ctx.font = font(400, 27 * s)
    ctx.fillStyle = 'rgba(34,32,15,0.9)'
    track(drawWrapped(ctx, node.summary, pad, t.bottom + 26 * s, w - pad * 2, 37 * s, 4))

    // 右下卷角：一块阴影三角 + 一块浅色三角
    const c = 78 * s
    ctx.fillStyle = 'rgba(90,78,12,0.34)'
    ctx.beginPath()
    ctx.moveTo(w - c, h); ctx.lineTo(w, h - c); ctx.lineTo(w, h)
    ctx.closePath(); ctx.fill()
    const curl = ctx.createLinearGradient(w - c, h, w, h - c)
    curl.addColorStop(0, '#efe08a')
    curl.addColorStop(1, '#c9b52c')
    ctx.fillStyle = curl
    ctx.beginPath()
    ctx.moveTo(w - c, h); ctx.lineTo(w, h - c); ctx.lineTo(w - c * 0.18, h - c * 0.18)
    ctx.closePath(); ctx.fill()
  },
}
