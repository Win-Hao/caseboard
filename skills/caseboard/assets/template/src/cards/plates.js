// 中心相纸没有配图时画的「标本图版」。
//
// 六种画法，按节点 id 的种子挑一种——所以同一块板永远是同一张图，
// 不同主题之间才有变化。也可以在 JSON 里写 "plate": "orbit" 指定。
//
// 六条共同约束（改之前先读，这些不是风格偏好，是踩出来的）：
//   1. 一律浅底深墨。深色底在这套强光下会被 ACES 抬成橄榄色——
//      三维场景里没有真正的黑，给什么反照率光都会把它照亮。
//   2. 主色只用在一个元素上。两处以上就没有视觉重心了。
//   3. 所有尺寸都是 R 的比例，不写死像素——总览和聚焦要同时成立。
//   4. 随机数只能来自传入的 rng，不许用 Math.random，否则每次重绘都在变。
//   5. 只在 box 范围内画，调用方已经 clip 过了，但别依赖它。
//   6. 屏幕上大约 200 px 宽时要还认得出形状，细节别做太碎。

const INK = 'rgba(38,30,22,'

/** 浅相纸底，六种画法共用。 */
function ground(ctx, box) {
  const bg = ctx.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height)
  bg.addColorStop(0, '#efe8d6')
  bg.addColorStop(1, '#ddd2b6')
  ctx.fillStyle = bg
  ctx.fillRect(box.x, box.y, box.width, box.height)
}

export const PLATES = {
  /** 同心圆刻度盘。中性、最像仪器面板，任何主题都不会出错。 */
  dial(ctx, g, accent) {
    const { cx, cy, R, s } = g
    ctx.lineWidth = 2 * s
    for (let i = 0; i < 48; i += 1) {
      const a = (i / 48) * Math.PI * 2
      const major = i % 4 === 0
      ctx.strokeStyle = INK + (major ? '0.42' : '0.20') + ')'
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * R * 0.32, cy + Math.sin(a) * R * 0.32)
      ctx.lineTo(cx + Math.cos(a) * R * (major ? 1 : 0.74), cy + Math.sin(a) * R * (major ? 1 : 0.74))
      ctx.stroke()
    }
    ctx.strokeStyle = INK + '0.5)'
    ctx.lineWidth = 2.5 * s
    for (const r of [R * 0.32, R * 0.74, R]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy)
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R)
    ctx.stroke()

    ctx.strokeStyle = accent
    ctx.lineWidth = 10 * s
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.53, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = accent
    ctx.beginPath(); ctx.arc(cx, cy, 15 * s, 0, Math.PI * 2); ctx.fill()
  },

  /** 测绘网格 + 配准十字 + 一条主色等值线。适合有"分布""区域"意味的主题。 */
  grid(ctx, g, accent, rng) {
    const { cx, cy, R, s, box } = g
    const step = R / 5
    ctx.strokeStyle = INK + '0.16)'
    ctx.lineWidth = 1.5 * s
    for (let i = -5; i <= 5; i += 1) {
      ctx.beginPath()
      ctx.moveTo(cx + i * step, cy - R); ctx.lineTo(cx + i * step, cy + R)
      ctx.moveTo(cx - R, cy + i * step); ctx.lineTo(cx + R, cy + i * step)
      ctx.stroke()
    }
    // 主轴
    ctx.strokeStyle = INK + '0.45)'
    ctx.lineWidth = 2.5 * s
    ctx.strokeRect(cx - R, cy - R, R * 2, R * 2)

    // 三个配准十字
    ctx.lineWidth = 2 * s
    for (const [px, py] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72]]) {
      const x = cx + px * R
      const y = cy + py * R
      ctx.beginPath()
      ctx.moveTo(x - 14 * s, y); ctx.lineTo(x + 14 * s, y)
      ctx.moveTo(x, y - 14 * s); ctx.lineTo(x, y + 14 * s)
      ctx.stroke()
      ctx.beginPath(); ctx.arc(x, y, 9 * s, 0, Math.PI * 2); ctx.stroke()
    }

    // 等值线：一圈被扰动的闭合曲线
    const pts = []
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2
      const rr = R * (0.34 + rng.next() * 0.28)
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9])
    }
    ctx.strokeStyle = accent
    ctx.lineWidth = 9 * s
    ctx.beginPath()
    ctx.moveTo((pts[0][0] + pts[13][0]) / 2, (pts[0][1] + pts[13][1]) / 2)
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    }
    ctx.closePath()
    ctx.stroke()
    void box
  },

  /** 星图：散点 + 连线，主色圈住其中一颗。适合"网络""关系""谱系"类主题。 */
  constellation(ctx, g, accent, rng) {
    const { cx, cy, R, s } = g
    const stars = []
    for (let i = 0; i < 16; i += 1) {
      const a = rng.next() * Math.PI * 2
      const rr = R * (0.15 + Math.sqrt(rng.next()) * 0.88)
      stars.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    }
    // 每颗连到最近的两颗
    ctx.strokeStyle = INK + '0.28)'
    ctx.lineWidth = 1.8 * s
    for (const a of stars) {
      const near = stars
        .filter((b) => b !== a)
        .sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]))
        .slice(0, 2)
      for (const b of near) {
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      }
    }
    ctx.fillStyle = INK + '0.72)'
    stars.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p[0], p[1], (i % 4 === 0 ? 9 : 5) * s, 0, Math.PI * 2); ctx.fill()
    })
    // 外框刻度
    ctx.strokeStyle = INK + '0.34)'
    ctx.lineWidth = 2 * s
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()

    // 主色：圈出最靠近中心的那颗
    const hero = stars.slice().sort(
      (p, q) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(q[0] - cx, q[1] - cy),
    )[0]
    ctx.strokeStyle = accent
    ctx.lineWidth = 8 * s
    ctx.beginPath(); ctx.arc(hero[0], hero[1], R * 0.19, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = accent
    ctx.beginPath(); ctx.arc(hero[0], hero[1], 11 * s, 0, Math.PI * 2); ctx.fill()
  },

  /** 地层剖面：横向层带 + 不同阴影线，主色标出其中一层。适合"阶段""层级""历史"。 */
  strata(ctx, g, accent, rng) {
    const { cx, cy, R, s } = g
    const left = cx - R
    const right = cx + R
    const bands = 6
    const bandH = (R * 2) / bands
    const heroBand = 1 + Math.floor(rng.next() * (bands - 2))

    for (let i = 0; i < bands; i += 1) {
      const top = cy - R + i * bandH
      ctx.save()
      ctx.beginPath(); ctx.rect(left, top, R * 2, bandH); ctx.clip()
      ctx.strokeStyle = INK + '0.26)'
      ctx.lineWidth = 1.6 * s
      const mode = i % 3
      if (mode === 0) {                       // 斜线
        for (let x = left - bandH; x < right + bandH; x += 13 * s) {
          ctx.beginPath(); ctx.moveTo(x, top + bandH); ctx.lineTo(x + bandH, top); ctx.stroke()
        }
      } else if (mode === 1) {                // 点
        ctx.fillStyle = INK + '0.30)'
        for (let x = left; x < right; x += 17 * s) {
          for (let y = top + 8 * s; y < top + bandH; y += 15 * s) {
            ctx.beginPath(); ctx.arc(x + (y % 2 ? 8 * s : 0), y, 2.4 * s, 0, Math.PI * 2); ctx.fill()
          }
        }
      } else {                                // 横线
        for (let y = top + 7 * s; y < top + bandH; y += 11 * s) {
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
        }
      }
      ctx.restore()
      ctx.strokeStyle = INK + '0.5)'
      ctx.lineWidth = 2.2 * s
      ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.stroke()
    }
    ctx.strokeStyle = INK + '0.5)'
    ctx.lineWidth = 2.2 * s
    ctx.strokeRect(left, cy - R, R * 2, R * 2)

    // 主色：标出一层
    const top = cy - R + heroBand * bandH
    ctx.strokeStyle = accent
    ctx.lineWidth = 9 * s
    ctx.beginPath()
    ctx.moveTo(left, top + bandH / 2); ctx.lineTo(right, top + bandH / 2)
    ctx.stroke()
    ctx.fillStyle = accent
    ctx.beginPath(); ctx.arc(left + R * 0.16, top + bandH / 2, 13 * s, 0, Math.PI * 2); ctx.fill()
  },

  /** 轨道图：偏心椭圆 + 卫星点。适合"循环""周期""相互作用"。 */
  orbit(ctx, g, accent, rng) {
    const { cx, cy, R, s } = g
    ctx.strokeStyle = INK + '0.16)'
    ctx.lineWidth = 1.5 * s
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy)
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R)
    ctx.stroke()

    const rings = 4
    for (let i = 0; i < rings; i += 1) {
      const rx = R * (0.30 + i * 0.22)
      const ry = rx * (0.42 + rng.next() * 0.4)
      const tilt = rng.range(-0.7, 0.7)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(tilt)
      ctx.strokeStyle = INK + '0.38)'
      ctx.lineWidth = 2.4 * s
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
      // 轨道上的一颗
      const a = rng.next() * Math.PI * 2
      ctx.fillStyle = INK + '0.7)'
      ctx.beginPath(); ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, 8 * s, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    ctx.fillStyle = accent
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.15, 0, Math.PI * 2); ctx.fill()
  },

  /** 示波图：网格 + 一条主色波形。适合"变化""信号""过程"。 */
  trace(ctx, g, accent, rng) {
    const { cx, cy, R, s } = g
    const left = cx - R
    const w = R * 2
    ctx.strokeStyle = INK + '0.15)'
    ctx.lineWidth = 1.5 * s
    for (let i = 0; i <= 8; i += 1) {
      const x = left + (w * i) / 8
      const y = cy - R + (w * i) / 8
      ctx.beginPath(); ctx.moveTo(x, cy - R); ctx.lineTo(x, cy + R); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke()
    }
    ctx.strokeStyle = INK + '0.5)'
    ctx.lineWidth = 2.4 * s
    ctx.strokeRect(left, cy - R, w, R * 2)
    ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + w, cy); ctx.stroke()

    // 三个正弦叠加，参数来自种子
    const f = [rng.range(1.2, 2.4), rng.range(2.6, 4.4), rng.range(5, 8)]
    const amp = [rng.range(0.28, 0.5), rng.range(0.1, 0.22), rng.range(0.04, 0.1)]
    const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)]
    ctx.strokeStyle = accent
    ctx.lineWidth = 8 * s
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120
      const x = left + w * t
      let y = cy
      for (let k = 0; k < 3; k += 1) y -= Math.sin(t * Math.PI * 2 * f[k] + ph[k]) * R * amp[k]
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.lineJoin = 'miter'
  },
}

export const PLATE_NAMES = Object.keys(PLATES)

/**
 * 画一张标本图版。
 * name 传了就用指定的，没传就按种子挑——同一节点永远是同一张。
 */
export function paintPlate(ctx, box, accent, rng, name) {
  const g = {
    box,
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    R: box.width * 0.46,
    s: box.width / 580,   // 参考宽度，和 photo 卡的相纸窗口一致
  }
  ground(ctx, box)
  const pick = PLATES[name] ? name : PLATE_NAMES[Math.floor(rng.next() * PLATE_NAMES.length)]
  PLATES[pick](ctx, g, accent, rng)
  return pick
}
