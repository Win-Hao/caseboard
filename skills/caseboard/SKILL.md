---
name: caseboard
description: 把主题或资料拆成层级，生成一块可交互的三维「侦探证据板」网页——软木板、红线、黄色便签详情面板。产出是 Vite + three.js 项目，npm run dev 直接看。
argument-hint: <主题，或要整理的资料>
disable-model-invocation: true
---

# Caseboard

Break a topic into a hierarchy and pin it onto a WebGL corkboard.

**Output**: a self-contained Vite + three.js project. The user runs `npm run dev` and can drag, zoom, click any piece of paper for details, and search with ⌘K.

## Input

This skill is only invoked explicitly via `/caseboard <topic or material>`. The argument is the topic, an article, a book, a tech stack — whatever should become the board. If no argument was given, ask what the topic is; don't guess.

---

## Workflow

### Step 1: Decompose the topic (**the most important step — never skip it**)

Break the topic into **three levels**. This structure directly determines whether the board looks good and works well.

```
L0  root            1        the topic itself           → large central photo card, "Start here"
L1  main branches   3–7      the topic's skeleton/axes   → dossier cards, red thread to root
L2  evidence        2–5/L1   concrete facts, defs, data  → slips/notes/clippings, thread to their L1
```

**Decomposition rules**

- **L1 entries are "dimensions", not "list items".** For coffee brewing, L1 should be `grind` / `water temp` / `ratio` / `extraction yield`, not `step 1` / `step 2`.
- **Keep L1 between 3 and 7.** Fewer than 3 and there's no sense of hierarchy; more than 7 and the board gets crowded.
- **Every L2 must be verifiable, concrete content**: a formula, a number, a quoted sentence, a year, a license clause. Vague "this matters a lot" doesn't belong.
- **Total node count 12–35.** Below 12 the board looks empty (coverage < 0.3); above 35 pieces overlap. The project's diagnostics report the actual coverage.
- **Every node needs a `summary`** (one sentence shown on the card, ≤ 30 CJK chars / ≤ 60 Latin chars) **and a `detail`** (focus-panel body, 2–5 sentences). Anything that doesn't fit on the card goes into `detail`.

**Worked example** — topic "Coffee Extraction". The approach: find the **mutually constraining variables** first, then give each one verifiable evidence:

```
Coffee Extraction                     ← L0: one sentence on what problem this topic solves
├─ Grind Size           blueprint     ← L1 named as a variable/dimension, not "chapter 1"
│  ├─ Surface Area      excerpt       ← L2 is a mechanism: halve the size, double the area
│  ├─ Fines             note          ← L2 is a side effect
│  └─ Channeling        clipping      ← L2 is a failure mode
├─ Water Temperature    dossier
│  ├─ Dissolution Order excerpt       ← acids first, sugars next, bitters last
│  └─ Follow the Roast  note
├─ Brew Ratio           stamp         ← facts: 1:15 – 1:17
│  └─ TDS               note          ← facts: 1.15 – 1.45 %
├─ Time & Flow          dossier
│  ├─ The Bloom         excerpt
│  └─ Early, Mid, Late  note
└─ Extraction Yield     blueprint     ← the "criterion" branch that unifies the other four
   ├─ The Golden Cup    quote         ← 18–22%, with SCA source
   ├─ Under vs. Over    clipping      ← diagnosis: sour = under, astringent = over
   └─ Refractometer     note
```

Reusable moves:

- **Pick L1 as "mutually constraining variables"**, not time slices or chapters. For history: institutions / technology / population / external shocks. For a book: its main lines of argument.
- **Reserve one branch as the "criterion" or "conclusion"** (here: extraction yield). With a convergence point, the red threads stop feeling scattered.
- **Rotate L2 roles**: mechanism / number / side effect / failure mode / diagnosis / tool. Every branch using the same role reads monotonous.
- **Fill `facts` with numbers whenever possible.** "1 : 15 – 1 : 17" beats "use a proper ratio".

**Present the decomposition to the user for confirmation before building anything** (an indented list like the one above is enough) — they may want to adjust the dimensions. In the same confirmation, **ask which language the board should display**: Chinese, English, or follow the source material (use AskUserQuestion if available). Write all board content — `title`, `summary`, `detail`, `facts`, case labels — in the chosen language. The runtime detects the content language automatically and switches UI labels, line-breaking, and font fallback to match; no configuration needed.

### Step 2: Pick a card type per node

Choose a `kind` for every node. Mix them — the board only gets texture if you don't use the same card everywhere.

| kind | Looks like | Use for |
|---|---|---|
| `dossier` | cream file card, binder clip, table area | L1 main branches (default) |
| `excerpt` | torn slip held by tape | passages quoted from papers/books |
| `note` | small square note, push pin | one-line points, term definitions |
| `quote` | kraft paper, torn edges, tape | quotations, verbatim lines |
| `stamp` | pale card, staple | licenses, specs, statutes, parameter tables |
| `photo` | polaroid white frame, pin, red title strip | nodes with an `image` |
| `clipping` | yellowed newspaper clipping, torn | news, events, points in time |
| `blueprint` | blue drafting paper, grid, binder clip | architecture, flows, formulas |
| `ledger` | pale-green ledger paper, ruled rows, right-aligned numbers | fact-heavy nodes: parameters, metrics, budgets |
| `index` | index card, red top rule + ruled lines + punch holes | term definitions, zettelkasten-style single notes |
| `telegram` | telegram paper, ALL CAPS + STOP breaks + feed holes | conclusions, warnings, non-negotiables |
| `chart` | **renders `facts` values as a bar chart** | comparable quantities: shares, weights, rankings |
| `timeline` | horizontal year axis, `facts` labels as time points | chronology, processes, evolution |
| `memo` | letterhead `MEMORANDUM` + RE line | positions, rules, official statements |
| `sticky` | saturated yellow sticky with curled corner, self-adhesive | open questions, TODOs, unsettled ideas |
| `ticket` | stub with perforation + vertical serial | single numberable records: one experiment, one event |

The root node uses `photo` (an image is nice; without one a procedural plate is drawn).

`chart` and `timeline` **require `facts`** — the whole layout depends on them. Missing facts produce an empty card plus a runtime warning.
`chart` only draws bars for values it can parse as numbers (`"42 %"` and `"1.5 小时"` both work); unparseable values are laid out as text — it never fakes bar lengths with random numbers.

Card sizes **auto-scale by level** (L1 ×1.16, L2 ×0.9), so even if an L2 node gets a large card kind, the main branches still dominate at overview zoom — hierarchy doesn't depend on picking the right `kind`.

### Step 3: Create the project

Output location: use the user's choice if they named one; otherwise create `<topic-slug>-board/` in the **user's current working directory**. Never create it inside the skill repo.

```bash
rsync -a --exclude node_modules --exclude dist <skill-dir>/assets/template/ <output-dir>/
cd <output-dir> && npm install
```

`<skill-dir>` is wherever this SKILL.md actually lives — the skill may be installed in `~/.claude/skills/`, a project-level `.claude/skills/`, or elsewhere; never hardcode it. Use rsync, not `cp -R`: the template dir may contain tens of MB of leftover `node_modules`, and BSD cp nests into `<output-dir>/template/` when the target exists.

Then **overwrite `data/board.json`**. The full schema is in `references/schema.md` — read it before writing. There aren't many fields, but a few constraints matter (`id` unique, `parent` must point to an existing L1, `facts` max 4 entries).

Images go into `public/`; reference them as `/filename.png` in the JSON. If there are no images, omit the `image` field — never fill in placeholder URLs.

### Step 4: Validate (**mandatory**)

**No browser needed** — run this first:

```bash
npm run check     # exit 0 = pass, 1 = problems
```

check.mjs has zero dependencies — **it does not need npm install to have finished**. Write board.json, check immediately, iterate; let npm install run in parallel.

It checks layout (coverage, overlap, out-of-bounds, quadrants), structure (duplicate ids, bad parents, node count), thread connectivity, image paths, and text length (a width heuristic — CJK counts double — that fails on over-limit `kicker`/`title`/`summary`, catching nearly all overflows) — and tells you exactly what to fix when something fails.

The browser's canvas-measured `textOverflows` remains the ground truth for edge cases. With a browser tool, read on; without one, start the dev server yourself and ask the user to open the URL — the devtools console prints one line, `[board] 排版合格` (pass) or `[board] 排版待改进: …` (needs work); them pasting that line back is enough.

With a browser, the board writes all diagnostics into the DOM after rendering — read them directly, no screenshots needed:

```js
document.querySelector('.kb-viewport').dataset
// pieceCount, coverageRatio, overlapRatio, maxPairOverlap, occupiedQuadrants,
// textOverflows, textTruncations, overflowIds, offBoardPieces,
// orphanPieces, orphanIds, imageFailures,
// boardSize, layoutAttempts, threadCount, drawCalls, triangles, fontState
```

Or call `window.__BOARD__.diagnostics()`.

`npm run check` covers everything in the table below (`textOverflows` via the length heuristic; canvas is exact).

**Pass thresholds**:

| Metric | Target | If failing |
|---|---|---|
| `coverageRatio` | 0.35 – 0.62 (check's hard floor/ceiling: 0.30 – 0.68) | too low → add L2 nodes; too high → remove nodes or raise `board.scale` |
| `maxPairOverlap` | < 0.15 | change `layout.seed` to reshuffle, or remove nodes |
| `occupiedQuadrants` | 4 | distribution uneven — check whether L1 count is too low |
| `textOverflows` | 0 | a `summary` is too long — shorten it (`overflowIds` lists the nodes) |
| `offBoardPieces` | 0 | too many nodes to fit — raise `layout.scale` |
| `orphanPieces` | 0 | a card isn't connected — check whether its `parent` points to an L2 node |
| `imageFailures` | 0 | bad `image` path — files go in `public/`, paths start with `/` |

Below 10 nodes, fewer than 3 branches, or above 38 nodes, the console prints advice directly — no need to count yourself.

If a check fails, edit the JSON and re-run. Never deliver a board with red diagnostics.

`layoutAttempts` shows which board sizes the solver tried and the max overlap of each; the one ending in `✓` is the one in use. If none has a check mark, the nodes are too crowded — cut content or raise `board.scale`.

Changing `layout.seed` (any string) reshuffles the whole layout — if it looks bad, try another seed; it's the cheapest fix. You can try without editing the file: `__BOARD__.reseed('another-seed')` in the console reshuffles immediately and returns fresh diagnostics.

### Step 5: Deliver

Do the launching yourself — don't hand the user a list of commands to type. Start the dev server in the background (`npm run dev`, port 5180; Vite auto-bumps the port if taken — read the actual URL from its output) and give the user the URL plus the controls in one line: drag to pan, scroll to zoom, click a piece for details, ⌘K to search, Esc back, 0 to fit.

Mention that `npm run build` produces a static site they can host anywhere — but only run it if they ask.

---

## Common adjustments

**Multiple topics**: put several case files in the `cases` array; the bottom panel switches between them. Good for "chapters of one book" or "subfields of one domain".

**Central card artwork**: when the root has no `image`, a procedural "specimen plate" is drawn — six styles (`dial` gauge / `grid` survey grid / `constellation` star map / `strata` strata section / `orbit` orbits / `trace` waveform). Cases in the same collection automatically get different ones; you can also pin one with `"plate": "orbit"` on the root. Pick one matching the topic's character: relationships → `constellation`, stages → `strata`, change over time → `trace`.

**Real images or not**: default is none — the procedural plates carry the layout fine. Add images only when the user asks or already has files: put them in `public/`, write `"image": "/filename.png"`. **Never scrape images from the web**: unknown provenance creates copyright problems for the user, hotlinks rot, and a network dependency breaks the guarantee that the same JSON reproduces the same board. If web images are truly needed, ask the user first, use only clearly licensed sources (Wikimedia Commons, Openverse), download into `public/`, and record the origin in that node's `sources`.

**Recolor**: each case's `accent` sets the primary color (threads, titles, highlights). Default is archive red `#8c171d`. For a cool scheme try `#1f4e5f`; dark green `#2d4a34`.

**Chinese and English**: the runtime detects the content language and switches UI copy, card type labels (`档案`/`FILE`), and panel headings accordingly. Writing English content requires zero configuration. CJK line-breaking and font fallback (Courier Prime + Songti) are prewired; a `summary` within 30 CJK chars / 60 Latin chars will not overflow.

**Two levels only.** If a `parent` points to another L2 node, the runtime re-hangs it on the grandparent and warns — you never silently get an unconnected orphan card, but fix the structure in the JSON anyway.

**Video**: add `video: "https://www.youtube.com/embed/XXX"` to a node; the focus panel renders it as a vintage monitor.

## Reference docs

- `references/schema.md` — complete `board.json` field reference
- `references/example-board.json` — the full JSON of the coffee example above, 17 nodes, all diagnostics green; usable as a starting template
- `references/materials.md` — materials / textures / palette parameter tables; read when changing the visual style
- `references/contributing-a-card.md` — how to add a new card style (two touch points, with a checklist)
