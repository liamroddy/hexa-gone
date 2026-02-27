import { HexDirection } from '../utils/hexDirections'

export const ARROW_ROTATION = {
  [HexDirection.North]:     0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]:     180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
}

const DEPTH_FACTOR = 0.28

function rawHexVerts(size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i)
    return { x: size * Math.cos(angle), y: size * Math.sin(angle) }
  })
}

export function hexPoints(size) {
  return rawHexVerts(size).map(v => `${v.x},${v.y}`).join(' ')
}

function toPointsStr(verts) {
  return verts.map(v => `${v.x},${v.y}`).join(' ')
}

// Vertex indices (pointy-top): 0=right, 1=bottom-right, 2=bottom-left, 3=left, 4=top-left, 5=top-right
export function extrudedHex(size) {
  const depth = size * DEPTH_FACTOR
  const verts = rawHexVerts(size)
  const topVerts = verts.map(v => ({ x: v.x, y: v.y - depth }))

  return {
    top:    toPointsStr(topVerts),
    bottom: toPointsStr([topVerts[2], topVerts[1], verts[1], verts[2]]),
    left:   toPointsStr([topVerts[3], topVerts[2], verts[2], verts[3]]),
    right:  toPointsStr([topVerts[1], topVerts[0], verts[0], verts[1]]),
    depth,
  }
}

export function arrowPath(size) {
  const hw = size * 0.05
  const hh = size * 0.18
  const tip  = -size * 0.42
  const base = tip + size * 0.28
  const tail =  size * 0.42

  return [
    `M 0,${tip}`,
    `L ${hh},${base}`,  `L ${hw},${base}`,
    `L ${hw},${tail}`,  `L ${-hw},${tail}`,
    `L ${-hw},${base}`, `L ${-hh},${base}`,
    `Z`,
  ].join(' ')
}

export function changerChevronPath(size) {
  const s = size * 0.28
  const gap = size * 0.28
  const chevrons = []
  for (let i = 0; i < 3; i++) {
    const cy = gap * (i - 1)
    chevrons.push(
      `M ${-s * 0.5},${cy + s * 0.4}`,
      `L 0,${cy - s * 0.4}`,
      `L ${s * 0.5},${cy + s * 0.4}`,
    )
  }
  return chevrons.join(' ')
}
