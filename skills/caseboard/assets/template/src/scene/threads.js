// 红线。两个批次：亮线本体 + 下沉一点的暗线当自阴影。
// 全部合并成两个几何体，所以整块板的连线只有 2 次 draw call。

import { Group, Mesh, TubeGeometry, CatmullRomCurve3, Vector3, MeshStandardMaterial, Color } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createRng } from '../core/rng.js'

const RADIUS = 0.021

/** 两点之间一条会下垂的线。 */
function threadCurve(a, b, sag, lift) {
  const mid = new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - sag, Math.max(a.z, b.z) + lift)
  return new CatmullRomCurve3([
    new Vector3(a.x, a.y, a.z + lift),
    mid,
    new Vector3(b.x, b.y, b.z + lift),
  ])
}

export function buildThreads(caseModel, layout, accent, anchors) {
  const group = new Group()
  const rng = createRng(`${caseModel.id}:threads`)
  const links = []

  // 挂点来自 buildHardware —— 就是图钉/夹子的实际位置。
  // 在这里自己算「顶边正中」的话，线会系在钉子旁边的空气上。
  const link = (from, to) => {
    const a = anchors.get(from.id)
    const b = anchors.get(to.id)
    if (a && b) links.push([a, b])
  }
  for (const branch of caseModel.branches) {
    link(caseModel.root, branch)
    for (const leaf of branch.children) link(branch, leaf)
  }
  // 除 root 外，每张卡都该至少连着一根线。连不上说明树结构断了。
  const connected = new Set()
  for (const branch of caseModel.branches) {
    connected.add(branch.id)
    for (const leaf of branch.children) connected.add(leaf.id)
  }
  const orphanIds = caseModel.nodes
    .filter((n) => n.level > 0 && !connected.has(n.id))
    .map((n) => n.id)

  if (links.length === 0) {
    return { object: group, diagnostics: { threadCount: 0, threadBatches: 0, orphanPieces: orphanIds.length, orphanIds } }
  }

  const main = []
  const shade = []
  for (const [a, b] of links) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const sag = dist * rng.range(0.025, 0.06)
    main.push(new TubeGeometry(threadCurve(a, b, sag, 0.30), Math.max(12, Math.round(dist * 3)), RADIUS, 6, false))
    // 暗线往右下偏一点，模拟线投在纸上的影子
    const ao = { x: a.x + 0.05, y: a.y - 0.06, z: a.z }
    const bo = { x: b.x + 0.05, y: b.y - 0.06, z: b.z }
    shade.push(new TubeGeometry(threadCurve(ao, bo, sag, 0.26), Math.max(10, Math.round(dist * 2)), RADIUS * 0.9, 5, false))
  }

  const shadeMesh = new Mesh(
    mergeGeometries(shade, false),
    new MeshStandardMaterial({ color: new Color(accent).multiplyScalar(0.42), roughness: 0.9, transparent: true, opacity: 0.55 }),
  )
  shadeMesh.renderOrder = 69
  group.add(shadeMesh)

  const mainMesh = new Mesh(
    mergeGeometries(main, false),
    new MeshStandardMaterial({ color: accent, roughness: 0.86, metalness: 0 }),
  )
  mainMesh.renderOrder = 70
  group.add(mainMesh)

  return {
    object: group,
    diagnostics: { threadCount: links.length, threadBatches: 2, orphanPieces: orphanIds.length, orphanIds },
  }
}
