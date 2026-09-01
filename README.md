# caseboard

一个 Claude Code skill：把任意知识点拆成层级，渲染成一块可交互的三维「侦探证据板」。

软木板上钉着档案卡、撕边纸条、便签、剪报，红线连接父子关系；点开任意纸片，右侧滑出黄色便签纸详情面板。产出是自包含的 Vite + three.js 项目，改一份 `data/board.json` 就能换掉全部内容。

![操作演示：总览 → 悬停高光 → 点开卡片 → 方向键切换 → ⌘K 搜索 → 回到全景 → 切换案卷](docs/demo.gif)

*上图：悬停 Grind Size 出现光晕 → 点开聚焦 → `→` 切到下一张 → `⌘K` 搜 "golden" 直达 → `0` 回全景 → 切换到第二块案卷板。界面语言随内容自动切换，中文内容即中文界面。*

## 用法

在 Claude Code 里显式调用（skill 设了 `disable-model-invocation`，不会被对话自动触发）：

```
/caseboard 咖啡萃取
/caseboard 把这篇论文整理成证据板：<粘贴内容>
```

Claude 会先给出层级拆解方案并问你板子用什么语言，确认后自动建项目、装依赖、
跑 `npm run check` 迭代到全绿，最后把 dev server 起好、直接给你一个可以打开的 URL——
全程不需要你敲命令。

| 操作 | 说明 |
|---|---|
| 拖拽 / 滚轮 | 平移 / 以光标为锚点缩放 |
| 点击纸片 | 打开详情面板并聚焦 |
| `←` `→` | 面板打开时切换上一条 / 下一条 |
| `⌘K` / `Ctrl+K` | 搜索全部节点 |
| `Esc` / `0` | 关闭面板 / 回到全景 |

## 安装

丢给任意 coding agent：

```
Install the caseboard skill from https://github.com/Win-Hao/caseboard
```

或用 [skills CLI](https://github.com/vercel-labs/skills)（跨 agent）：

```bash
npx skills add Win-Hao/caseboard -g
```

Claude Code 以 plugin 安装（跟随仓库更新）：

```
/plugin marketplace add Win-Hao/caseboard
/plugin install caseboard@caseboard
```

手动（复制文件，钉死当前版本）：

```bash
git clone https://github.com/Win-Hao/caseboard.git
cp -R caseboard/skills/* ~/.claude/skills/   # Claude Code
cp -R caseboard/skills/* ~/.codex/skills/    # Codex
```

**claude.ai**：从 [Releases](https://github.com/Win-Hao/caseboard/releases) 下载 `caseboard.skill`，在 Settings → Capabilities 里上传（该包已去掉 Claude Code 专有的 frontmatter 字段）。

## 目录

skill 本体在 `skills/caseboard/`：

| 路径 | 是什么 |
|---|---|
| `SKILL.md` | 工作流：拆层级 → 选卡片 → 建项目 → 验证 → 交付 |
| `references/schema.md` | `board.json` 字段说明、16 种卡片表、6 种边缘表 |
| `references/example-board.json` | 17 节点范本，诊断全绿，可直接改 |
| `references/materials.md` | 材质、纹理、光照参数表 |
| `references/contributing-a-card.md` | 怎么加一种新卡片（两处改动 + 上手清单） |
| `assets/template/` | 复制到输出目录的项目模板 |

## 单独跑模板

不经过 Claude 也能直接玩（demo 数据是 Coffee Extraction + Bread Fermentation 双案卷，英文示例）：

```bash
cd skills/caseboard/assets/template
npm install
npm run dev     # http://localhost:5180
npm run check   # 不开浏览器验证布局与结构，退出码 0 = 合格
npm run build   # 静态站输出到 dist/
```

## 设计要点

- **零贴图资产**。软木、木纹、纸纤维、每张卡片全部 Canvas 2D 程序化生成，仓库里没有一张图片。
- **确定性**。同一份数据加同一个种子，逐位复现同一块板；排版不满意换个 `layout.seed` 即可整体重排。
- **可验证**。渲染完把覆盖率、重叠、出界、孤儿、文字溢出写进 DOM（`.kb-viewport` 的 dataset），agent 不看截图也能判断排版是否合格；没有浏览器就跑 `npm run check`。
- **边缘是真几何**。撕边、锯齿、圆角六种轮廓走 `ShapeGeometry`，不是 alpha 抠图——投影也跟着轮廓走。
- **中英文自适应**。按内容自动判断语言，界面文案、卡片类型标签、断行与字体回退全部跟着切。
