/** The six hex directions (flat-top orientation). */
export const HexDirection = Object.freeze({
  North:     'N',
  NorthEast: 'NE',
  SouthEast: 'SE',
  South:     'S',
  SouthWest: 'SW',
  NorthWest: 'NW',
})

/** Returns the opposite direction. */
export function oppositeDir(dir) {
  const map = {
    [HexDirection.North]:     HexDirection.South,
    [HexDirection.NorthEast]: HexDirection.SouthWest,
    [HexDirection.SouthEast]: HexDirection.NorthWest,
    [HexDirection.South]:     HexDirection.North,
    [HexDirection.SouthWest]: HexDirection.NorthEast,
    [HexDirection.NorthWest]: HexDirection.SouthEast,
  }
  return map[dir]
}

/**
 * Creates a hex node data object.
 * @param {string} id        – unique identifier
 * @param {string} arrowDir  – one of HexDirection values
 * @returns a node with empty neighbor slots
 */
export function createHexNode(id, arrowDir) {
  return {
    id,
    arrowDirection: arrowDir,
    neighbors: {
      [HexDirection.North]:     null,
      [HexDirection.NorthEast]: null,
      [HexDirection.SouthEast]: null,
      [HexDirection.South]:     null,
      [HexDirection.SouthWest]: null,
      [HexDirection.NorthWest]: null,
    },
  }
}

/** Link two nodes as neighbors in the given direction (sets both sides). */
export function linkNodes(nodeA, dir, nodeB) {
  nodeA.neighbors[dir] = nodeB.id
  nodeB.neighbors[oppositeDir(dir)] = nodeA.id
}

/**
 * Build a small hex grid and return { nodes, nodeMap }.
 * Uses axial coordinates (q, r) with flat-top hexes.
 */
export function buildHexGrid(radius = 2) {
  const dirs = Object.values(HexDirection)
  const randomDir = () => dirs[Math.floor(Math.random() * dirs.length)]

  const nodes = []
  const coordMap = new Map() // "q,r" -> node

  // Generate axial coords within the given radius
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue
      const id = `${q},${r}`
      const node = createHexNode(id, randomDir())
      node.q = q
      node.r = r
      nodes.push(node)
      coordMap.set(id, node)
    }
  }

  // Axial neighbor offsets for flat-top hexes
  const axialOffsets = {
    [HexDirection.North]:     { dq:  0, dr: -1 },
    [HexDirection.NorthEast]: { dq:  1, dr: -1 },
    [HexDirection.SouthEast]: { dq:  1, dr:  0 },
    [HexDirection.South]:     { dq:  0, dr:  1 },
    [HexDirection.SouthWest]: { dq: -1, dr:  1 },
    [HexDirection.NorthWest]: { dq: -1, dr:  0 },
  }

  // Link neighbors
  for (const node of nodes) {
    for (const [dir, { dq, dr }] of Object.entries(axialOffsets)) {
      const neighborKey = `${node.q + dq},${node.r + dr}`
      const neighbor = coordMap.get(neighborKey)
      if (neighbor && !node.neighbors[dir]) {
        linkNodes(node, dir, neighbor)
      }
    }
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  return { nodes, nodeMap }
}
