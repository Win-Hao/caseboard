# board.json Schema

单一数据源。改这个文件就改了整块板子，不用碰渲染代码。

```jsonc
{
  "title":    "咖啡萃取",                // 必填，浏览器标题
  "subtitle": "四个变量和一条判据",       // 可选

  "layout": {
    "seed":  "board-v1",   // 布局随机种子。排得难看就换个字符串重排。
    "scale": 1.0           // 板子尺寸倍率。节点多了调到 1.15~1.4；节点少调到 0.8。
  },

  "cases": [ /* 见下 */ ]
}
```

## case（案卷）

底部面板一次显示一个 case，可以左右切换。一个主题就写一个。

```jsonc
{
  "id":     "extraction",             // 必填，唯一，用于 URL ?case=extraction
  "label":  "咖啡萃取",                // 必填，底部面板显示的名字，≤ 12 字
  "accent": "#8c171d",                // 可选，主色（红线/标题/强调）。默认 #8c171d
  "root":   { /* Node，L0 */ },       // 必填
  "nodes":  [ /* Node[]，L1 + L2 */ ] // 必填
}
```

## Node（节点）

```jsonc
{
  "id":      "grind",            // 必填，case 内唯一。小写连字符。
  "parent":  null,               // L1 写 null（挂到 root）；L2 写父 L1 的 id
  "kind":    "dossier",          // 必填，见 SKILL.md 卡片类型表
  "kicker":  "变量一",            // 可选，卡片顶部小标签，≤ 8 字
  "title":   "研磨度",            // 必填，≤ 20 字（中文）/ 30 字符（英文）
  "summary": "决定水和咖啡的接触面积。", // 必填，卡片正文，≤ 30 字 / 60 字符
  "detail":  "完整解释……",         // 必填，焦点面板正文，2–5 句，可以长

  "facts":   [                   // 可选，最多 4 条，卡片和面板都会显示
    { "label": "手冲典型", "value": "中细，砂糖粗细" }
  ],
  "bullets": [ "要点一", "要点二" ],  // 可选，最多 5 条，只在焦点面板显示
  "sources": [                   // 可选，最多 4 条
    { "label": "SCA Brewing Control Chart", "url": "https://sca.coffee/" }
  ],

  "plate":   "orbit",            // 可选，只对 root 有效。中心卡没有配图时画哪种图版：
                                 // dial | grid | constellation | strata | orbit | trace
                                 // 不写就自动分配，同一图集里各案卷保证不重样。
  "image":   "/grind.png",       // 可选。放 public/ 目录，路径以 / 开头。
  "imageCaption": "研磨粒径对比", // 可选，配 image 用
  "video":   "https://www.youtube.com/embed/XXXX", // 可选，必须是 embed 链接
  "videoCaption": "手冲萃取演示"
}
```

### 硬约束

| 规则 | 后果 |
|---|---|
| `id` 在 case 内唯一 | 重复会覆盖，红线连错 |
| `parent` 指向同 case 内已存在的、`parent: null` 的节点 | 指向 L2 会被当作 L1 处理 |
| 层级最多 2 层（L1 + L2） | L3 不渲染 |
| `title` / `summary` 超长 | `textOverflows` 诊断报警，卡片文字被截断 |
| `facts` > 4 条 | 只画前 4 条 |
| `image` 必须能加载 | 加载失败卡片留白，`imageFailures` 诊断报警 |

### 边缘类型

边缘是**真几何轮廓**，不是 alpha 抠图——投影也按轮廓算，抠图的话影子还是方的。

| edge | 长什么样 | 用在 |
|---|---|---|
| `clean` | 直角矩形 | 印刷品、卡纸 |
| `ripped` | 四边全部撕裂，振幅大 | 从整页上撕下来的 |
| `torn-top` | 只有上边撕裂 | 从便签本上撕下来的 |
| `deckle` | 细密毛边，振幅是 ripped 的三分之一 | 手工纸、打字纸 |
| `perforated` | 规则半圆齿孔绕一圈 | 邮票、连续纸、票据 |
| `notched` | 四角切角 | 档案卡的分类裁角 |

### `kind` 与自动分配的物理属性

渲染器按 `kind` 决定纸张颜色、撕边与否、材质、以及钉法。不用手动指定，混着用就行。

| kind | 纸色 | 边缘 | 五金 |
|---|---|---|---|
| `dossier` | `#d6c9a8` | clean | clip |
| `excerpt` | `#ded4b9` | ripped | tape |
| `note` | `#d2c8a3` | torn-top | pin |
| `quote` | `#cbb583` | ripped | tape |
| `stamp` | `#e0d9c2` | clean | staple |
| `photo` | `#d7c79f` | clean | pin |
| `clipping` | `#d8cba9` | ripped | pin |
| `blueprint` | `#93a8ac` | clean | clip |
| `ledger` | `#aebd9c` | notched | staple |
| `index` | `#ded6c0` | notched | pin |
| `telegram` | `#dcd4bd` | perforated | tape |
| `chart` | `#dcd5bf` | clean | clip |
| `timeline` | `#d9d1b9` | deckle | staple |
| `memo` | `#e2dac4` | deckle | clip |
| `sticky` | `#cfb92f` | clean | none |
| `ticket` | `#d5c9ab` | perforated | staple |
