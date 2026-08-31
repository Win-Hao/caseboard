// 种子随机。全流程确定性——同一个 seed 永远排出同一块板子。
// LCG: v = (v * 1664525 + 1013904223) mod 2^32

export function hashSeed(input) {
  let h = 2166136261 >>> 0
  const s = String(input)
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export function createRng(seed) {
  let v = hashSeed(seed)
  const next = () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0
    return v / 4294967296
  }
  return {
    next,
    /** [min, max) */
    range: (min, max) => min + next() * (max - min),
    /** 以 0 为中心的对称抖动 */
    jitter: (amount) => (next() - 0.5) * 2 * amount,
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    bool: (p = 0.5) => next() < p,
    fork: (label) => createRng(`${seed}:${label}`),
  }
}
