import { HexDirection } from '../utils/hexDirections'

export const ARROW_ROTATION = {
  [HexDirection.North]:     0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]:     180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
}

/* ── Extrusion depth as fraction of hex size ────────────────────── */
const DEPTH_FACTOR = 0.28

/* ── Flat hex vertices (pointy-top, vertex 0 = right) ──────────── */
function rawHexVerts(size) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i)
    return { x: size * Math.cos(a), y: size * Math.sin(a) }
  })
}

/* ── Public: hex points string (no squish, normal geometry) ─────── */
export function hexPoints(size) {
  return rawHexVerts(size).map(v => `${v.x},${v.y}`).join(' ')
}

/* ── 3D extruded hex geometry ───────────────────────────────────── *
 * The top face is LIFTED upward (-Y) by `depth` pixels.
 * The side faces connect the lifted top verts back down to the
 * grid-level (y + depth) so the piece sits ON TOP of the grid.
 *
 * Vertex indices (pointy-top hex, vertex 0 = right):
 *   0 = right, 1 = bottom-right, 2 = bottom-left,
 *   3 = left,  4 = top-left, 5 = top-right
 */
export function extrudedHex(size) {
  const depth = size * DEPTH_FACTOR
  const verts = rawHexVerts(size)

  // Top face: every vertex shifted up by depth
  const topVerts = verts.map(v => ({ x: v.x, y: v.y - depth }))
  const top = topVerts.map(v => `${v.x},${v.y}`).join(' ')

  // Bottom face (strip along bottom edge): top-lifted verts connect down to grid-level verts
  // Visible bottom: between bottom-left(2) and bottom-right(1)
  const bottomFace = [
    topVerts[2], topVerts[1],
    verts[1], verts[2],
  ].map(v => `${v.x},${v.y}`).join(' ')

  // Left face: between left(3) and bottom-left(2)
  const leftFace = [
    topVerts[3], topVerts[2],
    verts[2], verts[3],
  ].map(v => `${v.x},${v.y}`).join(' ')

  // Right face: between bottom-right(1) and right(0)
  const rightFace = [
    topVerts[1], topVerts[0],
    verts[0], verts[1],
  ].map(v => `${v.x},${v.y}`).join(' ')

  return { top, bottom: bottomFace, left: leftFace, right: rightFace, depth }
}

/* ── Arrow path (unchanged) ─────────────────────────────────────── */
export function arrowPath(size) {
  const hw = size * 0.05
  const hh = size * 0.18
  const tip  = -size * 0.42
  const base = -size * 0.42 + size * 0.28
  const tail =  size * 0.42

  return [
    `M 0,${tip}`,
    `L ${hh},${base}`,
    `L ${hw},${base}`,
    `L ${hw},${tail}`,
    `L ${-hw},${tail}`,
    `L ${-hw},${base}`,
    `L ${-hh},${base}`,
    `Z`,
  ].join(' ')
}
