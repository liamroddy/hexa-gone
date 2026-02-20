export const HexDirection = Object.freeze({
  North:     'N',
  NorthEast: 'NE',
  SouthEast: 'SE',
  South:     'S',
  SouthWest: 'SW',
  NorthWest: 'NW',
})

export const ALL_DIRECTIONS = Object.values(HexDirection)

const OPPOSITES = {
  [HexDirection.North]:     HexDirection.South,
  [HexDirection.NorthEast]: HexDirection.SouthWest,
  [HexDirection.SouthEast]: HexDirection.NorthWest,
  [HexDirection.South]:     HexDirection.North,
  [HexDirection.SouthWest]: HexDirection.NorthEast,
  [HexDirection.NorthWest]: HexDirection.SouthEast,
}

export function oppositeDir(dir) {
  return OPPOSITES[dir]
}

export const AXIAL_OFFSETS = {
  [HexDirection.North]:     { dq:  0, dr: -1 },
  [HexDirection.NorthEast]: { dq:  1, dr: -1 },
  [HexDirection.SouthEast]: { dq:  1, dr:  0 },
  [HexDirection.South]:     { dq:  0, dr:  1 },
  [HexDirection.SouthWest]: { dq: -1, dr:  1 },
  [HexDirection.NorthWest]: { dq: -1, dr:  0 },
}
