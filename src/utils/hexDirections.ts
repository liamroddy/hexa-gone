import type { Direction, AxialOffset } from '../types'

export const HexDirection = Object.freeze({
  North:     'N',
  NorthEast: 'NE',
  SouthEast: 'SE',
  South:     'S',
  SouthWest: 'SW',
  NorthWest: 'NW',
} as const satisfies Record<string, Direction>)

export const ALL_DIRECTIONS: readonly Direction[] = Object.values(HexDirection)

const OPPOSITES: Record<Direction, Direction> = {
  [HexDirection.North]:     HexDirection.South,
  [HexDirection.NorthEast]: HexDirection.SouthWest,
  [HexDirection.SouthEast]: HexDirection.NorthWest,
  [HexDirection.South]:     HexDirection.North,
  [HexDirection.SouthWest]: HexDirection.NorthEast,
  [HexDirection.NorthWest]: HexDirection.SouthEast,
}

export function oppositeDir(dir: Direction): Direction {
  return OPPOSITES[dir]
}

export const AXIAL_OFFSETS: Record<Direction, AxialOffset> = {
  [HexDirection.North]:     { dq:  0, dr: -1 },
  [HexDirection.NorthEast]: { dq:  1, dr: -1 },
  [HexDirection.SouthEast]: { dq:  1, dr:  0 },
  [HexDirection.South]:     { dq:  0, dr:  1 },
  [HexDirection.SouthWest]: { dq: -1, dr:  1 },
  [HexDirection.NorthWest]: { dq: -1, dr:  0 },
}
