import { HexDirection } from '../utils/hexDirections'

export const ARROW_ROTATION = {
  [HexDirection.North]:     0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]:     180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
}

export function hexPoints(size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angleRad = (Math.PI / 180) * (60 * i)
    return `${size * Math.cos(angleRad)},${size * Math.sin(angleRad)}`
  }).join(' ')
}

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
