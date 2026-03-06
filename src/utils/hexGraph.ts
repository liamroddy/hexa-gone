import type { Direction, HexNodeData, NodeMap } from '../types'
import { ALL_DIRECTIONS, oppositeDir, AXIAL_OFFSETS } from './hexDirections'

function createHexNode(id: string): HexNodeData {
  return {
    id,
    q: 0,
    r: 0,
    arrowDirection: undefined,
    neighbors: Object.fromEntries(ALL_DIRECTIONS.map(d => [d, null])) as Record<Direction, string | null>,
  }
}

function linkNodes(nodeA: HexNodeData, dir: Direction, nodeB: HexNodeData): void {
  nodeA.neighbors[dir] = nodeB.id
  nodeB.neighbors[oppositeDir(dir)] = nodeA.id
}

export function buildGridStructure(radius = 2): { nodes: HexNodeData[]; nodeMap: NodeMap } {
  const nodes: HexNodeData[] = []
  const coordMap = new Map<string, HexNodeData>()

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
    for (const [dir, { dq, dr }] of Object.entries(AXIAL_OFFSETS) as [Direction, { dq: number; dr: number }][]) {
      const neighborKey = `${node.q + dq},${node.r + dr}`
      const neighbor = coordMap.get(neighborKey)
      if (neighbor && !node.neighbors[dir]) {
        linkNodes(node, dir, neighbor)
      }
    }
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n])) as NodeMap
  return { nodes, nodeMap }
}
