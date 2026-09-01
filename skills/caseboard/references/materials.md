# Materials & Texture Parameters

Read this when changing the visual style. These values were tuned as one interdependent set —
copy them verbatim to get a working baseline, then change one value at a time.

## Renderer

```js
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping      = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
scene.background = new THREE.Color('#100e0c')
```

## Camera

```js
new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100)
camera.position.z = 12
// frustum recomputed every frame from viewport aspect and zoom
```

Orthographic is essential. A perspective camera destroys the "flat board on a wall" feel.

## Lighting (no shadow maps — IBL + three lights)

```js
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.32

HemisphereLight ('#ffe2b8', '#17212a', 1.45)              // warm sky / cool ground
DirectionalLight('#ffd8ad', 2.7 ).position.set(-8, 13, 16) // key light, warm, upper left
DirectionalLight('#a5c7d8', 0.55).position.set(12, -8, 10) // fill, cool, lower right
```

Key light is upper-left → all contact shadows offset to the lower right `(+0.09, -0.11)`. If you move the light, move the shadow offsets with it.

## Z layering (world units)

| z | Content | Material |
|---|---|---|
| −0.50 | outer vignette plane 50.2×29.2 | Basic `#000000` |
| −0.08 | corkboard 46.16×25.16 | Standard rough .96 bump .105 envI .2 |
| +0.02 | liner paper 44.38×23.3 | Basic `#dbc994` |
| +0.12 | wood frame, 4 bars, Box depth 0.34 | Standard `#3d2114` rough .5 metal .02 |
| +0.16 | dark inner frame line, width 0.09 | Standard `#1f110b` rough .58 |
| +0.30 | card shadows (InstancedMesh) | Basic `#1b0e09` |
| 0.40–0.60 | cards, z increases with layer | see below |
| +0.70 | red threads | Standard `#8c171d` / `#682629` rough .86 |
| +0.80 | hardware (InstancedMesh) | see below |

## Three card material tiers

```js
// photo paper / polaroid
MeshPhysicalMaterial { roughness:.42, clearcoat:.10, envMapIntensity:.62, bumpScale:.006 }
// plain paper
MeshStandardMaterial { roughness:.87, envMapIntensity:.36, bumpScale:.010 }
// sticky note / thin paper
MeshStandardMaterial { roughness:.92, envMapIntensity:.34, bumpScale:.012 }
```

Torn-edge cards use `ShapeGeometry` (real outlines); clean edges use `PlaneGeometry`. Don't use alpha cutouts — edges lose their sense of thickness.

## Hardware (all InstancedMesh)

```js
'pin-head'      LatheGeometry    MeshPhysical { clearcoat:.86, metalness:.08, roughness:.28 }
'pin-collar'    TorusGeometry    MeshStandard { metalness:.84, roughness:.24 }
'pin-stem'      CylinderGeometry MeshStandard { metalness:.62, roughness:.46 }
'tape-film'     PlaneGeometry    MeshPhysical { clearcoat:.08, roughness:.82, opacity:.42 }
'clip-body'     BoxGeometry      MeshStandard { metalness:.62, roughness:.46 }
'clip-handle'   TorusGeometry    MeshStandard { metalness:.62, roughness:.46 }
'staple-crown'  BoxGeometry      MeshStandard { metalness:.62, roughness:.46 }
'staple-legs'   BoxGeometry      MeshStandard { metalness:.62, roughness:.46 }
```

Pin head color pool: `#b8232a` `#c9772a` `#2f6d8c` `#4d7a4a` `#d8b23a` `#7a4a86`

## Procedural texture recipes

Everything is drawn with Canvas 2D — no texture files. PRNG is an LCG: `v = (v*1664525 + 1013904223) >>> 0`.

**Corkboard** — three 1024×576 canvases (albedo / roughness on `#818181` base / bump on `#eeeeee` base); the same set of ellipses is drawn onto all three simultaneously:

```
broadMottleCount 220    large mottled patches
chipCount       4800    wood chips
poreCount      13000    pores
compressionCount  90    compression marks
fissureCount     260    cracks
bumpScale .105  roughness .96  environmentIntensity .2
```

**Wood frame texture** — 1024×256, repeat(2.2, 1): vertical gradient `#5b301c → #32180f → #6c3a22`, overlaid with 54 grain lines; line i follows `y = 8 + i*4.7 + sin(x*0.018 + i)*3.5`; every 4th line dark `rgba(19,8,4,.30)`, the rest `rgba(190,112,65,.13)`.

**Paper fiber bump** — 256×256, repeat(2.4, 2.8): 1800 random dashes 2–8 px, `#666` (every 3rd) / `#aaa`, globalAlpha 0.16 + (i%5)*0.025.

**Card shadow** — fill the card outline polygon white → `ctx.filter = 'blur(Npx)'` → use as alpha map. Offset `(+0.09, −0.11, −0.035)`, scale ×1.025.

**Polaroid** — 768×880: base `#d7c79f` → white frame 684×684 @ (42,38) → red outline `#8b171d` 8px @ (30,26,708,708) → image contain-fit into (94,90,580,580) → title `700 52px` centered @ y=804 → red strip (250,842,268×7).

## HTML overlay palette

```css
--paper:        #f3f0e8   --ink:      #173047
--case-file:    linear-gradient(#dccca4 0%, #cbb587 68%, #c2a875 100%)
--case-border:  #806d4e
--legal-pad:    #f2df78   rule lines #49849d47   red margin line #b7373594
--binding:      linear-gradient(90deg, #6f4329, #4e2e1e 48%, #7d4d2e)
--accent-red:   #8b171d   --accent-ink: #a1302f
```

**Baseline grid**: the focus panel uses `--rule-step: 32px`; every `line-height` must be an integer multiple of it so text sits on the ruled lines. Break this and the whole panel falls apart.
