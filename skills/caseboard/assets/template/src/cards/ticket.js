// 票据存根。左边一条虚线撕口 + 竖排编号，右边正文。
// 适合放单个可编号的条目：一个事件、一条记录、一次实验。

import { font, drawWrapped, drawClipped, track } from './helpers.js'

export default {
  id: 'ticket',
  label: '存根', labelEn: 'STUB',
  stock: '#d5c9ab', ink: '#1f1b13', rule: '#877f6a',
  edge: 'perforated', surface: 'card', hardware: 'staple',
  size: [3.5, 1.9], texture: [760, 412],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 760
    const stub = 118 * s
    const pad = 40 * s

    // 存根区底色
    ctx.fillStyle = 'rgba(120,96,44,0.13)'
    ctx.fillRect(0, 0, stub, h)

    // 撕口虚线 + 两端的半圆缺口
    ctx.strokeStyle = 'rgba(31,27,19,0.5)'
    ctx.lineWidth = 2.4 * s
    ctx.setLineDash([9 * s, 9 * s])
    ctx.beginPath(); ctx.moveTo(stub, 14 * s); ctx.lineTo(stub, h - 14 * s); ctx.stroke()
    ctx.setLineDash([])
    // 外轮廓已经是 perforated 的真齿孔了，这里不要再抠洞——会和几何打架

    // 竖排编号
    ctx.save()
    ctx.translate(stub * 0.5, h * 0.5)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = accent
    ctx.font = font(700, 30 * s)
    ctx.letterSpacing = `${4 * s}px`
    ctx.fillText(`No ${String(100 + Math.floor(rng.next() * 899))}`, 0, 10 * s)
    ctx.letterSpacing = '0px'
    ctx.textAlign = 'left'
    ctx.restore()

    const x = stub + pad
    const bodyW = w - x - pad

    ctx.fillStyle = accent
    ctx.font = font(700, 21 * s)
    drawClipped(ctx, node.kicker.toUpperCase(), x, pad + 21 * s, bodyW)

    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 46 * s)
    const t = drawWrapped(ctx, node.title, x, pad + 78 * s, bodyW, 52 * s, 1)
    track(t)

    ctx.font = font(400, 25 * s)
    ctx.fillStyle = 'rgba(31,27,19,0.86)'
    track(drawWrapped(ctx, node.summary, x, t.bottom + 34 * s, bodyW, 34 * s, 2))

    if (node.facts.length) {
      ctx.font = font(700, 22 * s)
      ctx.fillStyle = accent
      const f = node.facts[0]
      drawClipped(ctx, `${f.label}  ${f.value}`, x, h - pad * 0.6, bodyW)
    }
  },
}
