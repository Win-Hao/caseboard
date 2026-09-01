# board.json Schema

Single source of truth. Editing this file changes the whole board; the rendering code never needs touching.

```jsonc
{
  "title":    "咖啡萃取",                // required, browser title
  "subtitle": "四个变量和一条判据",       // optional

  "layout": {
    "seed":  "board-v1",   // layout RNG seed. Ugly layout? Change the string to reshuffle.
    "scale": 1.0           // board size multiplier. Many nodes: 1.15–1.4; few nodes: 0.8.
  },

  "cases": [ /* see below */ ]
}
```

## case

The bottom panel shows one case at a time, switchable left/right. One topic = one case.

```jsonc
{
  "id":     "extraction",             // required, unique, used in URL ?case=extraction
  "label":  "咖啡萃取",                // required, name shown in the bottom panel, ≤ 12 chars
  "accent": "#8c171d",                // optional, primary color (threads/titles/highlights). Default #8c171d
  "root":   { /* Node, L0 */ },       // required
  "nodes":  [ /* Node[], L1 + L2 */ ] // required
}
```

## Node

```jsonc
{
  "id":      "grind",            // required, unique within the case. lowercase-hyphenated.
  "parent":  null,               // L1: null (hangs off root); L2: the id of its parent L1
  "kind":    "dossier",          // required, see the card type table in SKILL.md
  "kicker":  "变量一",            // optional, small label at the top of the card, ≤ 8 chars
  "title":   "研磨度",            // required, ≤ 20 CJK chars / 30 Latin chars
  "summary": "决定水和咖啡的接触面积。", // required, card body, ≤ 30 CJK / 60 Latin chars
  "detail":  "完整解释……",         // required, focus-panel body, 2–5 sentences, can be long

  "facts":   [                   // optional, max 4, shown on both card and panel
    { "label": "手冲典型", "value": "中细，砂糖粗细" }
  ],
  "bullets": [ "要点一", "要点二" ],  // optional, max 5, focus panel only
  "sources": [                   // optional, max 4
    { "label": "SCA Brewing Control Chart", "url": "https://sca.coffee/" }
  ],

  "plate":   "orbit",            // optional, root only. Which plate to draw when the central
                                 // card has no image: dial | grid | constellation | strata | orbit | trace
                                 // Omit to auto-assign; cases in one collection never repeat.
  "image":   "/grind.png",       // optional. Goes in public/, path starts with /.
  "imageCaption": "研磨粒径对比", // optional, pairs with image
  "video":   "https://www.youtube.com/embed/XXXX", // optional, must be an embed URL
  "videoCaption": "手冲萃取演示"
}
```

### Hard constraints

| Rule | Consequence when broken |
|---|---|
| `id` unique within its case | duplicates overwrite each other, threads connect wrong |
| `parent` points to an existing node in the same case with `parent: null` | pointing at an L2 gets treated as an L1 |
| Max 2 levels (L1 + L2) | L3 is not rendered |
| `title` / `summary` over length | `textOverflows` diagnostic fires, card text truncated |
| `facts` > 4 entries | only the first 4 are drawn |
| `image` must load | on failure the card area stays blank, `imageFailures` fires |

### Edge types

Edges are **real geometric outlines**, not alpha cutouts — shadows follow the outline too; with cutouts the shadow would still be rectangular.

| edge | Looks like | Used for |
|---|---|---|
| `clean` | square rectangle | printed matter, card stock |
| `ripped` | all four edges torn, large amplitude | torn out of a full page |
| `torn-top` | only the top edge torn | torn off a notepad |
| `deckle` | fine fuzzy edge, one third of ripped's amplitude | handmade / typing paper |
| `perforated` | regular semicircular punch holes all around | stamps, continuous forms, tickets |
| `notched` | four corners cut | file-card category notches |

### `kind` and its auto-assigned physical properties

The renderer derives paper color, edge, material, and mounting hardware from `kind`. No manual assignment needed — just mix kinds.

| kind | paper | edge | hardware |
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
