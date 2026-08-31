// 账本纸。给 facts 很多的节点用——数值右对齐排在栏线上，
// 比 dossier 的「标签在上、值在下」更适合读一串数字。
//
// 这个文件同时是「新增一种卡片」的范本，改它之前先看
// references/contributing-a-card.md。

import { font, drawWrapped, drawClipped, track, noteTruncation } from './helpers.js'

export default {
  id: 'ledger',
  label: '账目', labelEn: 'LEDGER',

  // 注意：主光很强，纸色要比直觉中暗一档才出得来颜色。
  // #c9d3bd 这种浅色在板上会被烤成白纸。
  stock: '#aebd9c', ink: '#161c12', rule: '#6b7a60',
  edge: 'notched', surface: 'paper', hardware: 'staple',
  size: [4.3, 3.1], texture: [900, 650],

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 900
    const pad = 56 * s
    const rowH = 52 * s
    const valueX = w - pad          // 数值右边界
    const valueW = 258 * s          // 数值列宽。窄了「1.5 – 2.5 小时」这种会被切掉
    const labelX = pad + 18 * s

    // 横向栏线，从标题下方一路铺到底
    const rulesTop = pad + 176 * s
    ctx.strokeStyle = node.spec.rule
    ctx.globalAlpha = 0.42
    ctx.lineWidth = 1.5 * s
    for (let y = rulesTop; y < h - pad * 0.5; y += rowH) {
      ctx.beginPath()
      ctx.moveTo(pad, y)
      ctx.lineTo(w - pad, y)
      ctx.stroke()
    }
    // 数值栏的竖线
    ctx.beginPath()
    ctx.moveTo(valueX - valueW, rulesTop - rowH)
    ctx.lineTo(valueX - valueW, h - pad * 0.5)
    ctx.stroke()
    ctx.globalAlpha = 1

    // 页眉
    ctx.fillStyle = accent
    ctx.font = font(700, 26 * s)
    ctx.fillText(node.kicker.toUpperCase(), pad, pad + 26 * s)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(600, 60 * s)
    track(drawWrapped(ctx, node.title, pad, pad + 96 * s, w - pad * 2, 68 * s, 1))

    // 摘要压在第一条栏线上方
    ctx.font = font(400, 29 * s)
    ctx.fillStyle = 'rgba(26,33,22,0.88)'
    track(drawWrapped(ctx, node.summary, pad, rulesTop - 14 * s, w - pad * 2, 38 * s, 1))

    // 逐行记账：标签左，数值右对齐
    let y = rulesTop + rowH - 16 * s
    let rows = 0
    for (const f of node.facts) {
      if (y > h - pad * 0.5) { noteTruncation(); break }
      ctx.fillStyle = node.spec.ink
      ctx.font = font(400, 30 * s)
      // 截断必须上报，否则诊断是绿的但卡片上是省略号
      track({ truncated: drawClipped(ctx, f.label, labelX, y, valueX - valueW - labelX - 16 * s) })

      ctx.textAlign = 'right'
      ctx.font = font(700, 30 * s)
      track({ truncated: drawClipped(ctx, f.value, valueX, y, valueW - 14 * s) })
      ctx.textAlign = 'left'

      y += rowH
      rows += 1
    }

    // 结账的双线
    if (rows > 0) {
      ctx.strokeStyle = node.spec.ink
      ctx.lineWidth = 2 * s
      const dy = y - rowH + 14 * s
      for (const off of [0, 6 * s]) {
        ctx.beginPath()
        ctx.moveTo(valueX - valueW, dy + off)
        ctx.lineTo(valueX, dy + off)
        ctx.stroke()
      }
    }
  },
}
