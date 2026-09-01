import { font, drawClipped, containFit, track } from './helpers.js'
import { paintPlate } from './plates.js'

export default {
  id: 'photo',
  label: '相片', labelEn: 'PLATE',
  stock: '#d7c79f', ink: '#241b14', rule: '#8b171d',
  edge: 'clean', surface: 'photo', hardware: 'pin',
  size: [3.2, 3.7], texture: [768, 880],

  // 相纸自己铺底，不要通用的做旧和折痕
  bare: true,
  // 声明需要图片，createCardTexture 会加载 node.image 后重绘
  usesImage: true,

  paint(ctx, node, w, h, rng, accent, media) {
    const image = media && media.image
    ctx.fillStyle = '#d7c79f'
    ctx.fillRect(0, 0, w, h)
    const sx = w / 768
    const sy = h / 880

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(42 * sx, 38 * sy, 684 * sx, 684 * sy)
    ctx.strokeStyle = accent
    ctx.lineWidth = 8 * sx
    ctx.strokeRect(30 * sx, 26 * sy, 708 * sx, 708 * sy)

    const box = { x: 94 * sx, y: 90 * sy, width: 580 * sx, height: 580 * sy }
    if (image) {
      const fit = containFit({ width: image.naturalWidth, height: image.naturalHeight }, box)
      ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height)
    } else {
      // 没图就画一张标本图版。六种画法按节点 id 的种子挑，
      // 也可以在 JSON 里写 "plate": "orbit" 指定。见 cards/plates.js。
      ctx.save()
      ctx.beginPath()
      ctx.rect(box.x, box.y, box.width, box.height)
      ctx.clip()
      paintPlate(ctx, box, accent, rng, node.plate)
      ctx.restore()
    }

    ctx.fillStyle = '#241b14'
    // 标题先按 64 排，放不下就逐档缩小到 44——根卡标题被截成省略号太难看
    let titleSize = 64
    ctx.font = font(700, titleSize * sx)
    while (titleSize > 44 && ctx.measureText(node.title).width > w - 80 * sx) {
      titleSize -= 4
      ctx.font = font(700, titleSize * sx)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    track({ truncated: drawClipped(ctx, node.title, w / 2, 804 * sy, w - 80 * sx) })
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = accent
    ctx.fillRect(250 * sx, 842 * sy, 268 * sx, 7 * sy)
  },
}
