// 正交相机控制器。zoom = 1 表示整块板刚好铺满视口。
// 聚焦时右侧被面板占掉，所以要把卡片摆到「剩下那块可视区」的中心，不是视口中心。

const MIN_ZOOM = 0.55
const MAX_ZOOM = 7

const lerp = (a, b, t) => a + (b - a) * t

export function createCameraController(camera, canvas, boardSize) {
  const state = { x: 0, y: 0, zoom: 1 }
  const target = { x: 0, y: 0, zoom: 1 }
  let clampToBoard = true

  const aspect = () => canvas.clientWidth / Math.max(canvas.clientHeight, 1)

  /**
   * zoom=1 时的半高。留的边比看起来需要的多——左下角有卷宗盒和便条，
   * 边留窄了它们就压在卡片上而不是压在画外。
   */
  const fitHalfHeight = () => {
    const a = aspect()
    const m = 1.13
    return Math.max((boardSize.outer.h / 2) * m, ((boardSize.outer.w / 2) * m) / a)
  }

  const halfHeight = (zoom = state.zoom) => fitHalfHeight() / zoom
  const worldPerPixel = (zoom = state.zoom) => (halfHeight(zoom) * 2) / Math.max(canvas.clientHeight, 1)

  function applyProjection() {
    const hh = halfHeight()
    const hw = hh * aspect()
    camera.left = -hw
    camera.right = hw
    camera.top = hh
    camera.bottom = -hh
    camera.position.x = state.x
    camera.position.y = state.y
    camera.updateProjectionMatrix()
  }

  function clamp() {
    if (!clampToBoard) return
    const hh = halfHeight(target.zoom)
    const hw = hh * aspect()
    // 板子比视口小的时候居中锁死，比视口大的时候允许平移到边缘
    const limX = Math.max(0, boardSize.outer.w / 2 - hw * 0.55)
    const limY = Math.max(0, boardSize.outer.h / 2 - hh * 0.55)
    target.x = Math.max(-limX, Math.min(limX, target.x))
    target.y = Math.max(-limY, Math.min(limY, target.y))
  }

  /** 屏幕像素 → 世界坐标 */
  function screenToWorld(px, py) {
    const rect = canvas.getBoundingClientRect()
    const hh = halfHeight()
    const hw = hh * aspect()
    const nx = ((px - rect.left) / rect.width) * 2 - 1
    const ny = -(((py - rect.top) / rect.height) * 2 - 1)
    return { x: state.x + nx * hw, y: state.y + ny * hh }
  }

  const api = {
    state,
    target,
    applyProjection,
    screenToWorld,
    worldPerPixel,

    setClamped(v) { clampToBoard = v },

    panByPixels(dx, dy) {
      const k = worldPerPixel(target.zoom)
      target.x -= dx * k
      target.y += dy * k
      clamp()
    },

    zoomAt(clientX, clientY, factor) {
      const before = screenToWorld(clientX, clientY)
      target.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target.zoom * factor))
      // 先假装已经到位，算出锚点漂移再补回去
      const saved = state.zoom
      state.zoom = target.zoom
      const after = screenToWorld(clientX, clientY)
      state.zoom = saved
      target.x += before.x - after.x
      target.y += before.y - after.y
      clamp()
    },

    zoomBy(factor) {
      target.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target.zoom * factor))
      clamp()
    },

    home() {
      target.x = 0
      target.y = 0
      target.zoom = 1
      clampToBoard = true
    },

    /**
     * 把一张卡片摆到「面板左侧那块可视区」的中心。
     * freeWidth = 画布宽度减去右侧面板占用的宽度。
     */
    focusOn(placement, freeWidth) {
      clampToBoard = false
      const [w, h] = placement.node.size
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      const free = Math.max(freeWidth, 240)

      // 让卡片占据可视区的 ~58%
      const fit = fitHalfHeight()
      const zoomForH = (fit * 2 * 0.58) / h
      const zoomForW = (fit * 2 * aspect() * (free / cw) * 0.62) / w
      target.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoomForH, zoomForW)))

      const k = (fit / target.zoom) * 2 / ch  // world per pixel at target zoom
      const offsetX = (free / 2 - cw / 2) * k
      target.x = placement.x - offsetX
      target.y = placement.y
    },

    /** 每帧插值。返回是否还在动。 */
    update() {
      const t = 0.14
      const dx = target.x - state.x
      const dy = target.y - state.y
      const dz = target.zoom - state.zoom
      const moving = Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4 || Math.abs(dz) > 1e-5
      if (moving) {
        state.x = lerp(state.x, target.x, t)
        state.y = lerp(state.y, target.y, t)
        state.zoom = lerp(state.zoom, target.zoom, t)
      } else {
        state.x = target.x
        state.y = target.y
        state.zoom = target.zoom
      }
      applyProjection()
      return moving
    },

    snap() {
      state.x = target.x
      state.y = target.y
      state.zoom = target.zoom
      applyProjection()
    },
  }

  applyProjection()
  return api
}
