<h1 align="center">caseboard</h1>

<p align="center">
  <em>Pin any topic to a 3D detective evidence board.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/works%20with-any%20SKILL.md%20agent-111111?style=flat-square" alt="Agents">
  <img src="https://img.shields.io/badge/image%20assets-zero%20·%20all%20procedural-111111?style=flat-square" alt="Zero assets">
  <img src="https://img.shields.io/badge/layout-deterministic%20·%20seeded-111111?style=flat-square" alt="Deterministic">
</p>

<p align="center">
  <sub><a href="README.zh-CN.md">简体中文</a></sub>
</p>

---

<p align="center">
  <img src="docs/demo.gif" alt="caseboard demo: hover glow, focusing a card, arrow-key navigation, ⌘K search, switching case files" width="820"><br>
  <sub>hover glow → focus a card → arrow through → ⌘K search → back to overview → second case file</sub>
</p>

An agent skill that breaks a topic — a paper, a book, a tech stack, a slice of history — into a three-level hierarchy and pins it onto an interactive WebGL corkboard: dossiers, torn slips, polaroids and sticky notes, red threads for parent-child links, a yellow legal-pad panel for details.

The output is a self-contained **Vite + three.js** project. One JSON file (`data/board.json`) holds all content; everything else — cork, wood grain, paper fiber, all 16 card faces — is drawn procedurally in Canvas 2D. Same JSON + same seed reproduces the same board, bit for bit.

## Quick start

In Claude Code (the skill is user-invoked only; it never triggers itself):

```
/caseboard coffee extraction
/caseboard turn this paper into an evidence board: <paste>
```

In any other coding agent:

```
Read the caseboard SKILL.md in this repo and build me a board about coffee extraction
```

The agent proposes the hierarchy, writes the board in whatever language you typed your request in, then scaffolds the project, installs dependencies, iterates `npm run check` until every diagnostic is green, starts the dev server, and hands you a URL. You type nothing.

| Control | Action |
|---|---|
| drag / scroll | pan / zoom at cursor |
| click a piece | open the detail panel, camera flies in |
| `←` `→` | previous / next piece while focused |
| `⌘K` / `Ctrl+K` | search every node |
| `Esc` / `0` | close panel / fit board |

## Install

Paste into any coding agent:

```
Install the caseboard skill from https://github.com/Win-Hao/caseboard
```

Or the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add Win-Hao/caseboard -g
```

Claude Code plugin (tracks this repo, updates on release):

```
/plugin marketplace add Win-Hao/caseboard
/plugin install caseboard@caseboard
```

Manual (copies the files, pins the current version):

```bash
git clone https://github.com/Win-Hao/caseboard.git
cp -R caseboard/skills/* ~/.claude/skills/   # Claude Code
cp -R caseboard/skills/* ~/.codex/skills/    # Codex
```

**claude.ai**: download `caseboard.skill` from [Releases](https://github.com/Win-Hao/caseboard/releases) and upload it under Settings → Capabilities (the package strips the Claude-Code-only frontmatter fields).

## Update

Match your install method:

```bash
claude plugin update caseboard@caseboard   # plugin (or: /plugin marketplace update caseboard)
npx skills add Win-Hao/caseboard -g        # skills CLI: re-running add refreshes it
```

Manual copies: pull (or re-clone) the repo and re-run the `cp -R`. On claude.ai,
download the latest `caseboard.skill` from Releases and upload it again to
replace the old one.

The marketplace entry pins no version, so plugin updates track this repo's latest commit.

## Run the demo without an agent

The bundled data is a two-case sample board (Coffee Extraction + Bread Fermentation, in English):

```bash
cd skills/caseboard/assets/template
npm install
npm run dev     # local URL printed by Vite
npm run check   # browserless validation, exit 0 = every diagnostic green
npm run build   # static site in dist/
```

## Design notes

- **Zero image assets.** Cork, wood, paper fiber and every card face are generated in Canvas 2D at runtime; the repo ships no textures.
- **Deterministic.** Layout, aging spots, pin colors all derive from seeds. Don't like the arrangement? Change `layout.seed` — one string, whole board reshuffles.
- **Verifiable without eyes.** The renderer writes coverage, overlap, out-of-bounds, orphan and text-overflow diagnostics into the DOM; `npm run check` covers the same gates in Node with zero dependencies — an agent can iterate to green without ever seeing a pixel.
- **Edges are real geometry.** Torn, deckled and perforated outlines are `ShapeGeometry`, not alpha cutouts — shadows follow the contour.
- **Bilingual runtime.** UI language, line-breaking and font fallback follow the content automatically; Chinese content gets a Chinese interface with zero configuration.

## Repo layout

The skill itself lives in `skills/caseboard/`:

| Path | What it is |
|---|---|
| `SKILL.md` | the workflow: decompose → pick cards → scaffold → validate → deliver |
| `references/schema.md` | full `board.json` field reference, 16 card kinds, 6 edge types |
| `references/example-board.json` | 17-node sample, all diagnostics green |
| `references/materials.md` | material / texture / lighting parameter tables |
| `references/contributing-a-card.md` | add a new card style (two touch points + checklist) |
| `assets/template/` | the project template copied into every output |

## License

[MIT](LICENSE)
