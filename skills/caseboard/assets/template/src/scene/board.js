// 软木板本体：暗晕 → 软木 → 木框 → 框内暗线。
// z 分层顺序见 references/materials.md，改动前先看那张表。

import {
  Group, Mesh, PlaneGeometry, BoxGeometry,
  MeshBasicMaterial, MeshStandardMaterial,
} from 'three'
import { createCorkTextures, CORK_PROFILE } from '../textures/cork.js'
import { createWoodTexture } from '../textures/wood.js'
import { BOARD } from '../core/spec.js'

export function buildBoard(size) {
  const group = new Group()
  const cork = size.cork
  const outer = size.outer

  // 板外的暗场，让边界不至于直接切到背景色
  const halo = new Mesh(
    new PlaneGeometry(outer.w * 1.05, outer.h * 1.09),
    new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55 }),
  )
  halo.position.set(0.55, -0.65, -0.5)
  halo.renderOrder = -20
  group.add(halo)

  const corkMaps = createCorkTextures(CORK_PROFILE)
  const corkMesh = new Mesh(
    new PlaneGeometry(cork.w, cork.h),
    new MeshStandardMaterial({
      map: corkMaps.map,
      roughnessMap: corkMaps.roughnessMap,
      bumpMap: corkMaps.bumpMap,
      bumpScale: CORK_PROFILE.bumpScale,
      roughness: CORK_PROFILE.roughness,
      metalness: 0,
      envMapIntensity: CORK_PROFILE.environmentIntensity,
    }),
  )
  corkMesh.position.z = -0.08
  corkMesh.renderOrder = -10
  group.add(corkMesh)

  // 木框
  const wood = createWoodTexture()
  const frameMat = new MeshStandardMaterial({
    map: wood, color: '#5a3520', roughness: 0.52, metalness: 0.03,
  })
  const T = BOARD.frameThickness
  const halfW = cork.w / 2 + T / 2
  const halfH = cork.h / 2 + T / 2
  const bars = [
    [outer.w, T, 0, halfH],
    [outer.w, T, 0, -halfH],
    [T, cork.h, -halfW, 0],
    [T, cork.h, halfW, 0],
  ]
  for (const [w, h, x, y] of bars) {
    const bar = new Mesh(new BoxGeometry(w, h, BOARD.frameDepth), frameMat)
    bar.position.set(x, y, 0.12)
    bar.renderOrder = -8
    group.add(bar)
  }

  // 框内暗线：木框投在软木上的接缝，缺了这条框会浮起来
  const seamMat = new MeshStandardMaterial({ color: '#1f110b', roughness: 0.58 })
  const seams = [
    [cork.w, 0.09, 0, cork.h / 2 - 0.045],
    [cork.w, 0.09, 0, -cork.h / 2 + 0.045],
    [0.09, cork.h, -cork.w / 2 + 0.045, 0],
    [0.09, cork.h, cork.w / 2 - 0.045, 0],
  ]
  for (const [w, h, x, y] of seams) {
    const seam = new Mesh(new PlaneGeometry(w, h), seamMat)
    seam.position.set(x, y, 0.16)
    seam.renderOrder = -7
    group.add(seam)
  }

  return group
}
