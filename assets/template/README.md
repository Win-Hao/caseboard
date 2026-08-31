# Knowledge Corkboard

一块可交互的三维证据板。所有内容来自 `data/board.json`。

```bash
npm install
npm run dev     # http://localhost:5180
npm run build   # 静态站输出到 dist/
```

## 操作

| 动作 | 说明 |
|---|---|
| 拖拽 | 平移 |
| 滚轮 / 双指 | 以光标为锚点缩放 |
| 点击纸片 | 打开右侧详情面板并聚焦 |
| `Esc` | 关闭面板 |
| `⌘K` / `Ctrl+K` | 搜索全部节点 |
| `←` `→` | 面板打开时切换上一条 / 下一条 |
| `0` | 回到全景 |

## 改内容

只改 `data/board.json`。字段说明在 skill 的 `references/schema.md`。
图片放 `public/`，JSON 里写 `/文件名.png`。

## 诊断

渲染完成后：

```js
window.__BOARD__.diagnostics()
// 或读 document.querySelector('.kb-viewport').dataset
```

`coverageRatio` 0.35–0.62、`maxPairOverlap` < 0.15、`textOverflows` 0、`offBoardPieces` 0 才算合格。
排版难看就改 `board.json` 里的 `layout.seed`。
