// 软木板纹理。同一组椭圆同时画到 albedo / roughness / bump 三张画布上，
// 这样凹陷处必然同时变暗、变粗糙、下沉——是质感成立的关键。

import { CanvasTexture, SRGBColorSpace, RepeatWrapping, Color } from 'three'
import { createRng } from '../core/rng.js'

export const CORK_PROFILE = {
  id: 'deep-archive-cork-v2',
  width: 1024,
  height: 576,
  color: '#6b4426',
  broadMottleCount: 220,
  chipCount: 5600,
  poreCount: 8200,
  compressionCount: 90,
  fissureCount: 260,
  bumpScale: 0.105,
  roughness: 0.96,
  environmentIntensity: 0.2,
}

const hex = (c) => `#${c.getHexString()}`

export function createCorkTextures(profile = CORK_PROFILE, seed = 'cork') {
  const { width, height } = profile
  const make = () => {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return [c, c.getContext('2d')]
  }
  const [albedoCanvas, a] = make()
  const [roughCanvas, r] = make()
  const [bumpCanvas, b] = make()

  const base = new Color(profile.color)
  const warm = base.clone().offsetHSL(0.012, -0.02, 0.07)
  const cool = base.clone().offsetHSL(-0.008, 0.02, -0.1)

  const grad = a.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, hex(warm))
  grad.addColorStop(0.52, profile.color)
  grad.addColorStop(1, hex(cool))
  a.fillStyle = grad
  a.fillRect(0, 0, width, height)
  r.fillStyle = '#818181'
  r.fillRect(0, 0, width, height)
  b.fillStyle = '#eeeeee'
  b.fillRect(0, 0, width, height)

  const rng = createRng(`${profile.id}:${seed}`)

  /** 一次落笔，三张画布同步。 */
  const blot = (x, y, rx, ry, rot, ca, cr, cb) => {
    for (const [ctx, fill] of [[a, ca], [r, cr], [b, cb]]) {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 大块斑驳：木板本身的深浅不匀
  for (let i = 0; i < profile.broadMottleCount; i += 1) {
    const x = rng.next() * width
    const y = rng.next() * height
    const rx = 18 + rng.next() * 74
    const ry = rx * (0.45 + rng.next() * 0.75)
    const dark = rng.bool(0.55)
    blot(x, y, rx, ry, rng.next() * Math.PI,
      dark ? 'rgba(42,22,10,0.10)' : 'rgba(206,158,104,0.075)',
      dark ? 'rgba(160,160,160,0.10)' : 'rgba(96,96,96,0.09)',
      dark ? 'rgba(178,178,178,0.09)' : 'rgba(246,246,246,0.07)')
  }

  // 木屑颗粒
  for (let i = 0; i < profile.chipCount; i += 1) {
    const x = rng.next() * width
    const y = rng.next() * height
    const rx = 1.6 + rng.next() * 5.4
    const ry = rx * (0.4 + rng.next() * 0.9)
    const t = rng.next()
    blot(x, y, rx, ry, rng.next() * Math.PI,
      t < 0.42 ? 'rgba(44,24,11,0.12)' : t < 0.78 ? 'rgba(176,128,78,0.10)' : 'rgba(100,60,30,0.11)',
      t < 0.42 ? 'rgba(184,184,184,0.16)' : 'rgba(88,88,88,0.13)',
      t < 0.42 ? 'rgba(158,158,158,0.15)' : 'rgba(250,250,250,0.10)')
  }

  // 气孔：软木最有辨识度的特征
  for (let i = 0; i < profile.poreCount; i += 1) {
    const x = rng.next() * width
    const y = rng.next() * height
    const rx = 0.5 + rng.next() * 1.7
    blot(x, y, rx, rx * (0.7 + rng.next() * 0.6), 0,
      'rgba(28,14,6,0.15)', 'rgba(214,214,214,0.16)', 'rgba(126,126,126,0.18)')
  }

  // 压痕：被反复钉过的地方
  for (let i = 0; i < profile.compressionCount; i += 1) {
    const x = rng.next() * width
    const y = rng.next() * height
    const rx = 26 + rng.next() * 58
    blot(x, y, rx, rx * (0.28 + rng.next() * 0.4), rng.next() * Math.PI,
      'rgba(38,20,9,0.07)', 'rgba(70,70,70,0.12)', 'rgba(196,196,196,0.13)')
  }

  // 裂纹：细长线
  for (let i = 0; i < profile.fissureCount; i += 1) {
    const x0 = rng.next() * width
    const y0 = rng.next() * height
    const len = 8 + rng.next() * 46
    const ang = rng.next() * Math.PI * 2
    const w = 0.6 + rng.next() * 1.5
    for (const [ctx, stroke] of [
      [a, 'rgba(26,13,6,0.22)'],
      [r, 'rgba(214,214,214,0.18)'],
      [b, 'rgba(104,104,104,0.20)'],
    ]) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + rng.jitter(6),
        y0 + Math.sin(ang) * len * 0.5 + rng.jitter(6),
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len,
      )
      ctx.stroke()
    }
  }

  // 板面暗角：光从左上来，右下和四角自然更暗。
  // 少了这一层，整块板会平得像一张色卡。
  const vig = a.createRadialGradient(
    width * 0.38, height * 0.30, Math.min(width, height) * 0.12,
    width * 0.52, height * 0.52, Math.max(width, height) * 0.72,
  )
  vig.addColorStop(0, 'rgba(255,236,208,0.07)')
  vig.addColorStop(0.45, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(16,8,3,0.42)')
  a.fillStyle = vig
  a.fillRect(0, 0, width, height)

  const map = new CanvasTexture(albedoCanvas)
  map.colorSpace = SRGBColorSpace
  const roughnessMap = new CanvasTexture(roughCanvas)
  const bumpMap = new CanvasTexture(bumpCanvas)
  for (const t of [map, roughnessMap, bumpMap]) {
    t.wrapS = RepeatWrapping
    t.wrapT = RepeatWrapping
    t.anisotropy = 8
  }
  return { map, roughnessMap, bumpMap, profile }
}
