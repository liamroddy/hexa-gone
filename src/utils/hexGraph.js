import { HexDirection, ALL_DIRECTIONS, oppositeDir, AXIAL_OFFSETS } from './hexDirections'

export function createHexNode(id) {
  return {
    id,
    arrowDirection: undefined,
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

export function linkNodes(nodeA, dir, nodeB) {
  nodeA.neighbors[dir] = nodeB.id
  nodeB.neighbors[oppositeDir(dir)] = nodeA.id
}

export function buildGridStructure(radius = 2) {
  const nodes = []
  const coordMap = new Map()

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue
      const id = `${q},${r}`
      const node = createHexNode(id)
      node.q = q
      node.r = r
      nodes.push(node)
      coordMap.set(id, node)
    }
  }

  for (const node of nodes) {
    for (const [dir, { dq, dr }] of Object.entries(AXIAL_OFFSETS)) {
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
