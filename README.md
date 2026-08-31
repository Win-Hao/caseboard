# knowledge-corkboard

一个 Claude Code skill：把任意知识点拆成层级，渲染成一块可交互的三维软木证据板。

软木板上钉着纸片、照片、便签，红线连接父子关系，点开是黄色便签纸详情面板。
产出是自包含的 Vite + three.js 项目，改 `data/board.json` 就能换内容。

## 安装位置

仓库在这里，通过软链接挂到 Claude Code 的 skills 目录：

```
~/vibe-coding/knowledge-corkboard/          ← 仓库（本目录）
~/.claude/skills/knowledge-corkboard  →  ↑  ← 软链接
```

在这里改完立即生效，不用同步。换机器重建软链接即可：

```bash
ln -s ~/vibe-coding/knowledge-corkboard ~/.claude/skills/knowledge-corkboard
```

## 目录

| 路径 | 是什么 |
|---|---|
| `SKILL.md` | 工作流：拆层级 → 选卡片 → 建项目 → 验证 → 交付 |
| `references/schema.md` | `board.json` 字段说明、16 种卡片表、6 种边缘表 |
| `references/contributing-a-card.md` | 怎么加一种新卡片（两处改动 + 上手清单） |
| `references/materials.md` | 材质、纹理、光照参数表 |
| `references/example-board.json` | 17 节点范本，诊断全绿，可直接改 |
| `assets/template/` | 复制到输出目录的项目模板 |

## 单独跑模板

```bash
cd assets/template
npm install
npm run dev     # http://localhost:5180
npm run check   # 不开浏览器验证布局与结构，退出码 0 = 合格
npm run build
```

## 设计要点

- **零贴图资产**。软木、木纹、纸纤维、每张卡片全部 Canvas 2D 程序化生成。
- **确定性**。同一份数据加同一个种子，逐位复现同一块板。
- **可验证**。渲染完把覆盖率、重叠、出界、孤儿、文字溢出写进 DOM，
  不看截图也能判断排版是否合格；没有浏览器就跑 `npm run check`。
- **边缘是真几何**。六种轮廓走 `ShapeGeometry`，不是 alpha 抠图——投影也跟着轮廓走。
