// 运行时装配。渲染按需触发（invalidate），静止时不烧 GPU。

import {
  WebGLRenderer, Scene, Color, Group, OrthographicCamera,
  HemisphereLight, DirectionalLight, PMREMGenerator,
  Raycaster, Vector2, SRGBColorSpace, ACESFilmicToneMapping,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

import './style.css'
import rawData from '../data/board.json'
import { buildModel } from './core/model.js'
import { solveLayout } from './core/layout.js'
import { buildBoard } from './scene/board.js'
import { buildPieces, applyHover } from './scene/pieces.js'
import { buildThreads } from './scene/threads.js'
import { buildHardware } from './scene/hardware.js'
import { createCameraController } from './scene/camera.js'
import { createCaseFile } from './ui/casefile.js'
import { createFocusPanel } from './ui/focus.js'
import { createPalette } from './ui/palette.js'
import { strings } from './core/i18n.js'

const stage = document.querySelector('.kb-stage')
const viewport = document.querySelector('.kb-viewport')
const status = document.querySelector('.kb-status')

/* ── 启动遮罩 ─────────────────────────────────────────────────── */

const boot = document.createElement('div')
boot.className = 'kb-boot'
boot.innerHTML = '<strong>正在钉板子… / Pinning the board…</strong>'
stage.appendChild(boot)

const fail = (err) => {
  boot.hidden = false
  boot.classList.add('is-error')
  boot.classList.remove('is-done')
  boot.innerHTML = `<strong>板子没搭起来 / Board did not come up</strong><pre>${String(err && err.stack || err)}</pre>`
  console.error(err)
}

/* ── 模型 ─────────────────────────────────────────────────────── */

let model
try {
  model = buildModel(rawData)
} catch (err) {
  fail(err)
  throw err
}
document.title = model.subtitle ? `${model.title} · ${model.subtitle}` : model.title
document.documentElement.lang = model.locale === 'en' ? 'en' : 'zh-CN'
const T = strings(model.locale)
boot.innerHTML = `<strong>${T.booting}</strong><span>${T.bootingSub}</span>`
for (const w of model.warnings) console.warn(`[board] ${w}`)

/* ── 渲染器 / 场景 ────────────────────────────────────────────── */

const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1
renderer.domElement.setAttribute('aria-hidden', 'true')
viewport.appendChild(renderer.domElement)

const scene = new Scene()
scene.background = new Color('#100e0c')

// 环境贴图给纸面和金属件提供细腻的反射，没有它图钉会像塑料玩具
const pmrem = new PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.32

const key = new DirectionalLight('#ffd8ad', 2.7)
key.position.set(-8, 13, 16)
const fill = new DirectionalLight('#a5c7d8', 0.55)
fill.position.set(12, -8, 10)
scene.add(new HemisphereLight('#ffe2b8', '#17212a', 1.45), key, fill)

const camera = new OrthographicCamera(-12, 12, 8, -8, 0.1, 100)
camera.position.z = 12

/* ── 每个案卷的场景内容 ───────────────────────────────────────── */

let world = null
let controller = null
let caseIndex = 0

function disposeWorld() {
  if (!world) return
  scene.remove(world.group)
  world.group.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      for (const k of ['map', 'bumpMap', 'roughnessMap', 'alphaMap']) m[k]?.dispose?.()
      m.dispose()
    }
  })
  world = null
}

function buildCase(index) {
  disposeWorld()
  caseIndex = Math.max(0, Math.min(model.cases.length - 1, index))
  const caseModel = model.cases[caseIndex]

  const layout = solveLayout(caseModel, model.layout)
  const group = new Group()
  group.add(buildBoard(layout.board))

  const pieces = buildPieces(caseModel, layout, caseModel.accent, () => invalidate())
  group.add(pieces.object)

  // 顺序不能反：红线要用五金件算出来的挂点
  const hardware = buildHardware(layout.placements, `${model.layout.seed}:${caseModel.id}`)
  group.add(hardware.object)

  const threads = buildThreads(caseModel, layout, caseModel.accent, hardware.anchors)
  group.add(threads.object)

  scene.add(group)
  world = { caseModel, layout, group, pieces, threads, hardware }

  controller = createCameraController(camera, renderer.domElement, layout.board)
  controller.home()
  controller.snap()

  caseFile.setCase(caseIndex)
  focus.close()
  focusedId = null
  syncUrl()
  writeDiagnostics()
  invalidate()
  return world
}

/* ── UI ───────────────────────────────────────────────────────── */

let focusedId = null

const caseFile = createCaseFile(stage, {
  locale: model.locale,
  cases: model.cases,
  onSelectCase: (i) => {
    if (i < 0 || i >= model.cases.length || i === caseIndex) return
    buildCase(i)
  },
  onHome: () => { closeFocus(); controller.home(); invalidate() },
  onSearch: () => palette.open(),
})

const focus = createFocusPanel(stage, {
  locale: model.locale,
  onClose: () => closeFocus(),
  onStep: (delta) => {
    const order = world.caseModel.order
    const i = order.findIndex((n) => n.id === focusedId)
    const next = order[i + delta]
    if (next) openFocus(next.id)
  },
  onNavigate: (id) => openFocus(id),
})

const palette = createPalette(stage, {
  locale: model.locale,
  entries: model.cases.flatMap((c, ci) => c.nodes.map((n) => ({
    id: n.id, caseIndex: ci, caseLabel: c.label,
    title: n.title, summary: n.summary || n.detail, kindLabel: n.kindLabel,
  }))),
  onPick: (entry) => {
    if (entry.caseIndex !== caseIndex) buildCase(entry.caseIndex)
    openFocus(entry.id)
  },
})

/* ── 聚焦 ─────────────────────────────────────────────────────── */

function panelFreeWidth() {
  const compact = stage.dataset.layout === 'compact'
  if (compact) return renderer.domElement.clientWidth
  const w = renderer.domElement.clientWidth
  // 44% 给面板：焦点态的主角是正文，板子只需要露出被聚焦的卡和它的邻居。
  // 上限 940 是单栏正文可读行宽的极限，再宽一行字太长。
  const panel = Math.min(Math.max(w * 0.44, 420), 940)
  stage.style.setProperty('--focus-width', `${Math.round(panel)}px`)
  return w - panel - 84
}

function relatedOf(node) {
  const c = world.caseModel
  const out = []
  if (node.parent) {
    const p = c.byId.get(node.parent)
    if (p) out.push({ id: p.id, relation: T.parent, title: p.title, summary: p.summary })
  }
  for (const ch of node.children) {
    out.push({ id: ch.id, relation: T.child, title: ch.title, summary: ch.summary })
  }
  return out.slice(0, 6)
}

function openFocus(id) {
  const node = world.caseModel.byId.get(id)
  const placement = world.layout.byId.get(id)
  if (!node || !placement) return
  focusedId = id
  stage.dataset.interactionMode = 'focused'

  const free = panelFreeWidth()
  const order = world.caseModel.order
  // 树结构异常时节点可能不在阅读序列里，别让序号变成 -1
  const idx = order.findIndex((n) => n.id === id)
  focus.render(node, {
    index: idx >= 0 ? idx : 0,
    total: order.length,
    accent: world.caseModel.accent,
    related: relatedOf(node),
  })
  controller.focusOn(placement, free)
  status.textContent = T.opened(node.title)
  syncUrl()
  invalidate()
}

function closeFocus() {
  if (!focusedId) return
  focusedId = null
  focus.close()
  stage.dataset.interactionMode = 'exploring'
  controller.setClamped(true)
  controller.home()
  syncUrl()
  invalidate()
}

/* ── 指针交互 ─────────────────────────────────────────────────── */

const raycaster = new Raycaster()
const ndc = new Vector2()
const pointers = new Map()
let dragging = false
let moved = 0
let pinchDistance = 0
let hoveredId = null

function pickAt(clientX, clientY) {
  if (!world) return null
  const rect = renderer.domElement.getBoundingClientRect()
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
  ndc.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObjects(world.pieces.records.map((r) => r.mesh), false)
  if (hits.length === 0) return null
  // 取渲染顺序最高的那张（视觉上压在最上面的）
  hits.sort((a, b) => b.object.renderOrder - a.object.renderOrder)
  return hits[0].object.userData.nodeId
}

viewport.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  viewport.setPointerCapture(e.pointerId)
  if (pointers.size === 1) { dragging = true; moved = 0 }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDistance = Math.hypot(a.x - b.x, a.y - b.y)
  }
})

viewport.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId)
  if (!prev) {
    // 只是划过，做悬停检测
    const id = pickAt(e.clientX, e.clientY)
    if (id !== hoveredId) {
      hoveredId = id
      viewport.dataset.hovering = id ? 'true' : 'false'
      invalidate(20)
    }
    return
  }
  const dx = e.clientX - prev.x
  const dy = e.clientY - prev.y
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  moved += Math.hypot(dx, dy)

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDistance > 0) {
      controller.setClamped(true)
      controller.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchDistance)
    }
    pinchDistance = d
  } else if (dragging) {
    controller.setClamped(true)
    controller.panByPixels(dx, dy)
  }
  invalidate()
})

function endPointer(e) {
  const had = pointers.has(e.pointerId)
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDistance = 0
  if (!had) return
  if (pointers.size === 0) {
    dragging = false
    if (moved < 6) {
      const id = pickAt(e.clientX, e.clientY)
      if (id) openFocus(id)
      else closeFocus()
    }
  }
}
viewport.addEventListener('pointerup', endPointer)
viewport.addEventListener('pointercancel', endPointer)

viewport.addEventListener('wheel', (e) => {
  e.preventDefault()
  controller.setClamped(true)
  controller.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016))
  invalidate()
}, { passive: false })

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    palette.isOpen ? palette.close() : palette.open()
    return
  }
  if (palette.isOpen) return
  if (e.key === 'Escape') { closeFocus(); return }
  if (e.target instanceof HTMLInputElement) return
  if (e.key === '0') { closeFocus(); controller.home(); invalidate(); return }
  if (focusedId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    const order = world.caseModel.order
    const i = order.findIndex((n) => n.id === focusedId)
    const next = order[i + (e.key === 'ArrowRight' ? 1 : -1)]
    if (next) openFocus(next.id)
  }
})

/* ── URL 状态 ─────────────────────────────────────────────────── */

function syncUrl() {
  const params = new URLSearchParams()
  params.set('case', model.cases[caseIndex].id)
  if (focusedId) params.set('node', focusedId)
  const next = `${location.pathname}?${params}`
  if (next !== location.pathname + location.search) history.replaceState(null, '', next)
  viewport.dataset.urlState = `?${params}`
}

function readUrl() {
  const params = new URLSearchParams(location.search)
  const ci = model.cases.findIndex((c) => c.id === params.get('case'))
  return { caseIndex: ci >= 0 ? ci : 0, nodeId: params.get('node') }
}

/* ── 布局 / 尺寸 ──────────────────────────────────────────────── */

function resize() {
  const w = viewport.clientWidth
  const h = viewport.clientHeight
  renderer.setSize(w, h, false)
  stage.dataset.layout = w < 900 ? 'compact' : 'wide'
  if (controller) {
    controller.applyProjection()
    if (focusedId) {
      const p = world.layout.byId.get(focusedId)
      if (p) controller.focusOn(p, panelFreeWidth())
    }
  }
  invalidate()
}
window.addEventListener('resize', resize)

/* ── 诊断 ─────────────────────────────────────────────────────── */

function writeDiagnostics() {
  if (!world) return {}
  const info = renderer.info
  const d = {
    ...world.layout.diagnostics,
    ...world.threads.diagnostics,
    ...world.hardware.diagnostics,
    ...world.pieces.collect(),
    caseId: world.caseModel.id,
    caseCount: model.cases.length,
    nodeCount: world.caseModel.nodes.length,
    fontState: document.fonts ? document.fonts.status : 'unknown',
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
  }
  for (const [k, v] of Object.entries(d)) {
    viewport.dataset[k] = Array.isArray(v) ? v.join(',') : String(v)
  }
  return d
}

/* ── 渲染循环 ─────────────────────────────────────────────────── */

let framesLeft = 0
const invalidate = (n = 1) => { framesLeft = Math.max(framesLeft, n) }

function tick() {
  requestAnimationFrame(tick)
  if (!world || !controller) return
  const cameraMoving = controller.update()
  const hoverMoving = applyHover(world.pieces, hoveredId)
  if (cameraMoving || hoverMoving) invalidate(2)
  if (framesLeft <= 0) return
  framesLeft -= 1
  renderer.render(scene, camera)
}

/* ── 启动 ─────────────────────────────────────────────────────── */

try {
  const initial = readUrl()
  resize()
  buildCase(initial.caseIndex)
  resize()
  tick()

  if (initial.nodeId) {
    requestAnimationFrame(() => openFocus(initial.nodeId))
  }

  const settle = () => {
    invalidate(4)
    requestAnimationFrame(() => {
      const d = writeDiagnostics()
      boot.classList.add('is-done')
      setTimeout(() => { boot.hidden = true }, 420)
      const bad = []
      if (d.textOverflows > 0) bad.push(`${d.textOverflows} 处文字溢出 (${d.overflowIds})`)
      if (d.offBoardPieces > 0) bad.push(`${d.offBoardPieces} 张卡片超出板面`)
      if (d.orphanPieces > 0) bad.push(`${d.orphanPieces} 张卡片没有连线 (${d.orphanIds})`)
      if (d.imageFailures > 0) bad.push(`${d.imageFailures} 张图片加载失败`)
      if (d.maxPairOverlap > 0.15) bad.push(`最大重叠 ${d.maxPairOverlap}`)
      if (d.coverageRatio < 0.3 || d.coverageRatio > 0.68) bad.push(`覆盖率 ${d.coverageRatio}`)
      if (bad.length) console.warn('[board] 排版待改进：\n  - ' + bad.join('\n  - '))
      else console.info('[board] 排版合格', d)
    })
  }

  if (document.fonts) document.fonts.ready.then(settle)
  else setTimeout(settle, 300)

  window.__BOARD__ = {
    model,
    // 调试用：直接摸场景对象和卡片材质
    get world() { return world },
    get scene() { return scene },
    diagnostics: () => writeDiagnostics(),
    focus: openFocus,
    goCase: buildCase,
    reseed(seed) {
      model.layout.seed = String(seed)
      buildCase(caseIndex)
      return writeDiagnostics()
    },
  }
} catch (err) {
  fail(err)
}
