# Adding a New Card Style

## First, understand what is random

Nothing on the board is "different on every refresh". Three tiers:

| Tier | Decided by | Changes? |
|---|---|---|
| Which card (`kind`) | the author, in `board.json` | never |
| Paper color / edge / material / hardware / size | the `kind`, in `src/cards/<kind>.js` | never |
| Aging spots · creases · torn-edge outline | seeded RNG, seed = **node id** | same node always looks the same |
| Pin colors · tape angles · card positions | seeded RNG, seed = `layout.seed` | only when the seed changes |

So "the same JSON renders bit-identically twice" is guaranteed. Changing `layout.seed` reshuffles positions and hardware, but paper colors and layouts within cards are untouched — those come entirely from `kind`.

---

## Three steps

### 1. Add a file `src/cards/<your-id>.js`

```js
import { font, header, factList, drawWrapped, track } from './helpers.js'

export default {
  id: 'telegram',                        // unique; authors write "kind": "telegram" in JSON
  label: '电报', labelEn: 'CABLE',        // zh/en type labels, shown on the card top and in the panel

  stock: '#d8cdb4',                      // paper color
  ink: '#1e1a13',                        // body text color
  rule: '#8d8064',                       // frame/divider color

  edge: 'clean',                         // clean | ripped | torn-top | deckle | perforated | notched
                                         // all real geometric outlines; shadows follow them
  surface: 'paper',                      // photo | paper | thin | card — controls roughness/sheen
  hardware: 'tape',                      // pin | tape | clip | staple | none

  size: [4.0, 2.4],                      // world units. Board interior is ~30 × 16; stay under 5
  texture: [860, 520],                   // canvas pixels. Keep the same ratio as size, ~210 px per world unit

  paint(ctx, node, w, h, rng, accent) {
    const s = w / 860                    // scale factor — multiply every dimension by it
    const pad = 56 * s
    const y = header(ctx, node, w, pad, s, accent)
    ctx.fillStyle = node.spec.ink
    ctx.font = font(400, 34 * s)
    track(drawWrapped(ctx, node.summary, pad, y + 60 * s, w - pad * 2, 46 * s, 3))
  },
}
```

### 2. Register it in `src/cards/index.js`

```js
import telegram from './telegram.js'

export const CARDS = [
  …,
  telegram,
]
```

That's both touch points. Layout, materials, hardware, shadows, the focus panel, ⌘K search, and diagnostics all pick it up automatically — no changes to `spec.js`, `pieces.js`, or `layout.js`.

`index.js` has a startup self-check: a missing field or a bad `edge`/`hardware` throws immediately instead of rendering a blank card.

### 3. Update two docs

`SKILL.md` and `references/schema.md` each have a card type table — add the new type, or the agent won't know it exists.

---

## The paint contract

```js
paint(ctx, node, w, h, rng, accent, media)
```

| Param | What it is |
|---|---|
| `ctx` | 2D context. Arrives with `textAlign='left'`, `textBaseline='alphabetic'` — **restore them if you change them** |
| `node` | normalized node. Commonly `node.title` `node.summary` `node.kicker` `node.facts` `node.spec` |
| `w` `h` | canvas pixel size, equal to your declared `texture` |
| `rng` | seeded RNG, seed = node id. `rng.next()` `rng.range(a,b)` `rng.jitter(n)` `rng.pick(arr)` |
| `accent` | the current case's primary color. **Never hardcode red** — users change the accent |
| `media` | `{ image }`, only meaningful if you declared `usesImage: true` |

**Before** your paint runs, the framework has drawn the paper base (uneven tint, mildew spots, darkened edges); **after** it, creases are overlaid. Declare `bare: true` to skip both and paint everything yourself (`photo` does this).

### Six hard rules

1. **Fonts only via `font(weight, size)`** — never build the string yourself; the CJK/Latin fallback stack lives in there.
2. **Multiply every dimension by `s`.** Hardcoded pixels break at other `texture` sizes.
3. **Call `track()` wherever text may truncate**, or the diagnostics stay green while the layout is broken — which is lying.
   Pass the return value of `drawWrapped` / `wrap` straight into `track()`; if something simply doesn't fit, call `noteTruncation()`.
4. **Pick paper colors one step darker than instinct.** Key light at 2.7 plus ambient bakes a light color like `#c9d3bd` into blank white. When unsure, start from the `#aebd9c` tier.
5. **No external assets.** Every texture is drawn in Canvas 2D on the fly; a single image file breaks the zero-asset premise.
6. **Titles must be readable at overview zoom.** Cards are ~200 px wide on screen; keep title font size at `48 * s` or larger.

---

## Verify

```bash
npm run dev
```

Drop a node using the new `kind` into `data/board.json`, then:

```js
window.__BOARD__.diagnostics()   // textOverflows must be 0
window.__BOARD__.world.pieces.records.find(r => r.node.kind === 'your-id')
```

Then run the browserless layout validation (the new card's `size` enters the solver):

```bash
npm run check
```

### Checklist

- [ ] `id` doesn't collide with an existing one
- [ ] `label` / `labelEn` both filled
- [ ] `size` and `texture` share the same ratio
- [ ] every dimension in `paint` is multiplied by `s`
- [ ] used `accent` instead of hardcoded colors
- [ ] `track()` called at truncation points
- [ ] any changed `textAlign` / `textBaseline` / `save()` is restored
- [ ] title readable at overview zoom
- [ ] `diagnostics().textOverflows === 0`
- [ ] both tables updated (`SKILL.md` and `schema.md`)

**Don't give every new card `clean` edges.** A board full of square rectangles reads flat —
edge outlines are defined in `outlineOf` in `src/scene/geometry.js`; adding one is just another switch branch.

`src/cards/ledger.js` was written to this spec — copy its structure.

---

## Bonus: adding a central-card plate

The plates drawn when the central card (`photo`) has no image live in `src/cards/plates.js`.
Adding one is a single function in the `PLATES` object:

```js
myplate(ctx, g, accent, rng) {
  // g = { box, cx, cy, R, s } — R is the radius, s the scale factor
}
```

`PLATE_NAMES` includes it automatically, and `model.js`'s auto-assignment picks it up.
Six constraints are listed at the top of that file — the two that matter most: **light base, dark ink, always** (dark bases get baked olive by the key light), and **the accent color goes on exactly one element**.
