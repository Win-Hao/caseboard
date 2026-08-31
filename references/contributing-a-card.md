# 新增一种卡片样式

## 先搞清楚什么是随机的

板子上没有任何东西是「每次刷新都不一样」的。分三层：

| 层 | 谁决定 | 会不会变 |
|---|---|---|
| 用哪种卡片（`kind`） | 作者在 `board.json` 里写死 | 不变 |
| 纸色 / 边缘 / 材质 / 五金 / 尺寸 | 由 `kind` 决定，写在 `src/cards/<kind>.js` | 不变 |
| 做旧斑点 · 折痕 · 撕边轮廓 | 种子随机，种子 = **节点 id** | 同一节点永远长得一样 |
| 图钉颜色 · 胶带角度 · 卡片位置 | 种子随机，种子 = `layout.seed` | 换 seed 才变 |

所以「同样的 JSON 渲染两次逐位一致」是保证。改 `layout.seed` 会重排位置和五金，
但纸色和版式不受影响——那些完全由 `kind` 决定。

---

## 三步

### 1. 加一个文件 `src/cards/<你的-id>.js`

```js
import { font, header, factList, drawWrapped, track } from './helpers.js'

export default {
  id: 'telegram',                        // 唯一，作者在 JSON 里写 "kind": "telegram"
  label: '电报', labelEn: 'CABLE',        // 中英文类型标签，会显示在卡片顶部和面板里

  stock: '#d8cdb4',                      // 纸色
  ink: '#1e1a13',                        // 正文颜色
  rule: '#8d8064',                       // 线框/分隔线颜色

  edge: 'clean',                         // clean | ripped | torn-top | deckle | perforated | notched
                                         // 全都是真几何轮廓，投影跟着轮廓走
  surface: 'paper',                      // photo | paper | thin | card，决定粗糙度和反光
  hardware: 'tape',                      // pin | tape | clip | staple | none

  size: [4.0, 2.4],                      // 世界单位。板子内区大约 30 × 16，别超过 5
  texture: [860, 520],                   // 画布像素。保持和 size 同比例，约 210 px / 世界单位

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 860                    // 缩放系数，所有尺寸都乘它
    const pad = 56 * s
    const y = header(ctx, node, w, pad, s, accent)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 34 * s)
    track(drawWrapped(ctx, node.summary, pad, y + 60 * s, w - pad * 2, 46 * s, 3))
  },
}
```

### 2. 在 `src/cards/index.js` 注册

```js
import telegram from './telegram.js'

export const CARDS = [
  …,
  telegram,
]
```

就这两处。布局、材质、五金、投影、焦点面板、⌘K 搜索、诊断全部自动认得它——
不用改 `spec.js`、`pieces.js`、`layout.js` 里的任何一行。

`index.js` 底部有启动自检，字段缺了或者 `edge`/`hardware` 写错会直接抛异常，
不会等到渲染出一张白卡才发现。

### 3. 更新两处文档

`SKILL.md` 和 `references/schema.md` 里各有一张卡片类型表，把新类型加进去，
否则 agent 不知道有这个选项。

---

## paint 契约

```js
paint(ctx, node, w, h, rng, accent, media)
```

| 参数 | 是什么 |
|---|---|
| `ctx` | 2D context。进来时 `textAlign='left'`、`textBaseline='alphabetic'`，**改了要改回去** |
| `node` | 归一化后的节点。常用 `node.title` `node.summary` `node.kicker` `node.facts` `node.spec` |
| `w` `h` | 画布像素尺寸，等于你声明的 `texture` |
| `rng` | 种子随机数，种子是节点 id。`rng.next()` `rng.range(a,b)` `rng.jitter(n)` `rng.pick(arr)` |
| `accent` | 当前案卷的主色。**别写死红色**，用户会改主色 |
| `media` | `{ image }`，只有声明了 `usesImage: true` 才有意义 |

**调用之前**框架已经画好了纸底（不匀的底色、霉斑、边缘压暗）；
**调用之后**会叠上折痕。声明 `bare: true` 可以跳过这两步自己全画（`photo` 就是这么做的）。

### 六条硬规则

1. **字体只走 `font(weight, size)`**，别自己拼字符串——中英文回退栈在那里面。
2. **所有尺寸乘 `s`**。写死像素在别的 `texture` 尺寸下会崩。
3. **可能截断文字的地方要 `track()`**，否则排版出问题诊断还是绿的，等于骗人。
   `drawWrapped` / `wrap` 的返回值直接传给 `track()`；纯粹放不下就调 `noteTruncation()`。
4. **纸色要比直觉暗一档**。主光强度 2.7 加环境光，`#c9d3bd` 这种浅色会被烤成白纸。
   拿不准就先取 `#aebd9c` 这一档试。
5. **不要引入外部资源**。所有纹理都是 Canvas 2D 现画的，加一张图片就破坏了「零资产」这个前提。
6. **总览缩放下标题要能读**。卡片在屏幕上大约 200 px 宽，标题字号别低于 `48 * s`。

---

## 验证

```bash
npm run dev
```

在 `data/board.json` 里塞一个用新 `kind` 的节点，然后：

```js
window.__BOARD__.diagnostics()   // textOverflows 必须是 0
window.__BOARD__.world.pieces.records.find(r => r.node.kind === '你的id')
```

再跑一遍布局压力测试（会自动把新类型混进各种树形里）：

```bash
node stress.mjs
```

### 上手清单

- [ ] `id` 没和现有的重复
- [ ] `label` / `labelEn` 都填了
- [ ] `size` 和 `texture` 同比例
- [ ] `paint` 里所有尺寸都乘了 `s`
- [ ] 用了 `accent` 而不是写死的颜色
- [ ] 截断处调了 `track()`
- [ ] 改过 `textAlign` / `textBaseline` / `save()` 的地方都还原了
- [ ] 总览下标题能读
- [ ] `diagnostics().textOverflows === 0`
- [ ] `SKILL.md` 和 `schema.md` 的表格都更新了

**别让新卡片都用 `clean`。** 一板子直角矩形会显得很平——
边缘类型的定义在 `src/scene/geometry.js` 的 `outlineOf`，加一种也只是往 switch 里加一支。

`src/cards/ledger.js` 是照这套规范写的，可以直接抄结构。

---

## 顺带：加一种中心卡图版

中心卡（`photo`）没有配图时画的图版在 `src/cards/plates.js`，
加一种只需要往 `PLATES` 对象里加一个函数：

```js
myplate(ctx, g, accent, rng) {
  // g = { box, cx, cy, R, s }，R 是半径，s 是缩放系数
}
```

`PLATE_NAMES` 会自动包含它，`model.js` 的自动分配也会把它算进去。
六条约束写在那个文件开头——最要紧的两条：**一律浅底深墨**（深色底会被强光烤成橄榄色），
**主色只用在一个元素上**。
