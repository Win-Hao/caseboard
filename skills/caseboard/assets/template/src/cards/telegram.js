// 电报纸。全大写、字距拉开、用 STOP 断句，顶边一排送纸孔。
// 适合放结论和警告——这种排版天生就有"紧急、简短、不容商量"的语气。

import { font, drawWrapped, drawClipped, track } from './helpers.js'

export default {
  id: 'telegram',
  label: '电报', labelEn: 'CABLE',
  stock: '#dcd4bd', ink: '#201c15', rule: '#8e8674',
  edge: 'perforated', surface: 'thin', hardware: 'tape',
  size: [3.7, 2.2], texture: [800, 476],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 800
    const pad = 52 * s

    // 顶边送纸孔
    ctx.fillStyle = 'rgba(40,32,22,0.22)'
    for (let x = 26 * s; x < w - 20 * s; x += 34 * s) {
      ctx.beginPath(); ctx.arc(x, 20 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill()
    }
    ctx.strokeStyle = 'rgba(40,32,22,0.24)'
    ctx.lineWidth = 1.6 * s
    ctx.beginPath(); ctx.moveTo(0, 40 * s); ctx.lineTo(w, 40 * s); ctx.stroke()

    // 抬头行：类型 + 一个假的流水号，制造"这是一份实物档案"的错觉
    ctx.fillStyle = accent
    ctx.font = font(700, 20 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, 80 * s)
    ctx.fillStyle = 'rgba(32,28,21,0.45)'
    ctx.textAlign = 'right'
    ctx.fillText(`NO. ${String(1000 + Math.floor(rng.next() * 8999))}`, w - pad, 80 * s)
    ctx.textAlign = 'left'

    ctx.fillStyle = node.spec.ink
    ctx.font = font(700, 44 * s)
    ctx.letterSpacing = `${3 * s}px`
    const t = drawWrapped(ctx, node.title.toUpperCase(), pad, 138 * s, w - pad * 2, 52 * s, 1)
    track(t)

    // 正文用 STOP 断句，这是电报的语法
    ctx.font = font(400, 26 * s)
    ctx.letterSpacing = `${1.5 * s}px`
    const body = node.summary.replace(/[。．.]\s*/g, ' STOP ').trim()
    track(drawWrapped(ctx, body, pad, t.bottom + 44 * s, w - pad * 2, 40 * s, 3))
    ctx.letterSpacing = '0px'

    ctx.strokeStyle = accent
    ctx.lineWidth = 4 * s
    ctx.beginPath()
    ctx.moveTo(pad, h - 34 * s); ctx.lineTo(pad + 120 * s, h - 34 * s)
    ctx.stroke()
  },
}
