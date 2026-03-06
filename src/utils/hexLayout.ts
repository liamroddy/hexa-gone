import type { Direction, Point, HexLayout } from '../types'
import { AXIAL_OFFSETS } from './hexDirections'

const HEX_GAP = 12
const VERTICAL_GAP = HEX_GAP * (Math.sqrt(3) / 2)
export const DEPTH_FACTOR = 0.28

export function createLayout(hexSize: number): HexLayout {
  const cellWidth = hexSize * 2 + HEX_GAP
  const cellHeight = hexSize * Math.sqrt(3) + VERTICAL_GAP

  function hexToPixel(q: number, r: number): Point {
    return {
      x: cellWidth * (3 / 4) * q,
      y: cellHeight * (r + q / 2),
    }
  }

  function stepPixelForDir(dir: Direction): Point {
    const offset = AXIAL_OFFSETS[dir]
    if (!offset) return { x: 0, y: 0 }
    const from = hexToPixel(0, 0)
    const to = hexToPixel(offset.dq, offset.dr)
    return { x: to.x - from.x, y: to.y - from.y }
  }

  return { cellWidth, cellHeight, hexToPixel, stepPixelForDir }
}
