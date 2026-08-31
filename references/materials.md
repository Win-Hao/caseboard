# 材质与纹理参数表

想改视觉风格时看这个。这些数值是调出来的一整套，互相牵制——
改动前建议先照抄跑通，再一次只动一个值。

## 渲染器

```js
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping      = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
scene.background = new THREE.Color('#100e0c')
```

## 相机

```js
new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100)
camera.position.z = 12
// 每帧按视口宽高比和 zoom 重算 frustum
```

正交是关键。换成透视会破坏"平贴在墙上的板子"的感觉。

## 光照（不开阴影贴图，全靠 IBL + 三灯）

```js
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.32

HemisphereLight ('#ffe2b8', '#17212a', 1.45)              // 天光暖 / 地面冷
DirectionalLight('#ffd8ad', 2.7 ).position.set(-8, 13, 16) // 主光，左上暖
DirectionalLight('#a5c7d8', 0.55).position.set(12, -8, 10) // 补光，右下冷
```

主光在左上 → 所有接触阴影往右下偏移 `(+0.09, -0.11)`。改光向必须同步改阴影偏移。

## Z 轴分层（世界单位）

| z | 内容 | 材质 |
|---|---|---|
| −0.50 | 外圈暗晕平面 50.2×29.2 | Basic `#000000` |
| −0.08 | 软木板 46.16×25.16 | Standard rough .96 bump .105 envI .2 |
| +0.02 | 内衬纸 44.38×23.3 | Basic `#dbc994` |
| +0.12 | 木框 4 条，Box 厚 0.34 | Standard `#3d2114` rough .5 metal .02 |
| +0.16 | 框内暗线，宽 0.09 | Standard `#1f110b` rough .58 |
| +0.30 | 卡片投影（InstancedMesh） | Basic `#1b0e09` |
| 0.40–0.60 | 卡片，按 layer 递增 | 见下 |
| +0.70 | 红线 | Standard `#8c171d` / `#682629` rough .86 |
| +0.80 | 五金件（InstancedMesh） | 见下 |

## 卡片材质三档

```js
// 相纸 / 宝丽来
MeshPhysicalMaterial { roughness:.42, clearcoat:.10, envMapIntensity:.62, bumpScale:.006 }
// 普通纸
MeshStandardMaterial { roughness:.87, envMapIntensity:.36, bumpScale:.010 }
// 便签 / 薄纸
MeshStandardMaterial { roughness:.92, envMapIntensity:.34, bumpScale:.012 }
```

撕边卡片用 `ShapeGeometry`（真几何轮廓），干净边用 `PlaneGeometry`。别用 alpha 抠图，边缘会没有厚度感。

## 五金件（全部 InstancedMesh）

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

图钉头颜色池：`#b8232a` `#c9772a` `#2f6d8c` `#4d7a4a` `#d8b23a` `#7a4a86`

## 程序化纹理配方

全部用 Canvas 2D 画，无贴图文件。PRNG 用 LCG：`v = (v*1664525 + 1013904223) >>> 0`。

**软木板** — 三张 1024×576 canvas（albedo / roughness `#818181` 底 / bump `#eeeeee` 底），同一组椭圆同时画到三张上：

```
broadMottleCount 220    大块斑驳
chipCount       4800    木屑颗粒
poreCount      13000    气孔
compressionCount  90    压痕
fissureCount     260    裂纹
bumpScale .105  roughness .96  environmentIntensity .2
```

**木框纹理** — 1024×256，repeat(2.2, 1)：竖向渐变 `#5b301c → #32180f → #6c3a22`，叠 54 条纹路，第 i 条的 y 轨迹 `8 + i*4.7 + sin(x*0.018 + i)*3.5`，每 4 条一条深色 `rgba(19,8,4,.30)`，其余 `rgba(190,112,65,.13)`。

**纸纤维 bump** — 256×256，repeat(2.4, 2.8)：1800 条 2–8 px 随机短划线，`#666`（每 3 条一条）/ `#aaa`，globalAlpha 0.16 + (i%5)*0.025。

**卡片投影** — 把卡片轮廓多边形填白 → `ctx.filter = 'blur(Npx)'` → 当 alpha 贴图。偏移 `(+0.09, −0.11, −0.035)`，缩放 ×1.025。

**宝丽来** — 768×880：底 `#d7c79f` → 白框 684×684 @ (42,38) → 红描边 `#8b171d` 8px @ (30,26,708,708) → 图片 contain 进 (94,90,580,580) → 标题 `700 52px` 居中 @ y=804 → 红条 (250,842,268×7)。

## HTML 覆盖层配色

```css
--paper:        #f3f0e8   --ink:      #173047
--case-file:    linear-gradient(#dccca4 0%, #cbb587 68%, #c2a875 100%)
--case-border:  #806d4e
--legal-pad:    #f2df78   横线 #49849d47   红竖线 #b7373594
--binding:      linear-gradient(90deg, #6f4329, #4e2e1e 48%, #7d4d2e)
--accent-red:   #8b171d   --accent-ink: #a1302f
```

**基线网格**：焦点面板用 `--rule-step: 32px`，所有 `line-height` 必须是它的整数倍，文字才会落在横线上。破坏这条整个面板会散。
