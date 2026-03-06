import type { Direction, NodeMap, ChangerMap, Board } from '../types'
import { ALL_DIRECTIONS, AXIAL_OFFSETS } from './hexDirections'
import { buildGridStructure } from './hexGraph'
import { pickRandom } from './helpers'
import { DIRECTION_COLOUR } from '../theme'

export function changerCountForRadius(radius: number): number {
  if (radius <= 2) return 3
  const totalHexes = 3 * radius * radius + 3 * radius + 1
  return Math.max(3, Math.round(totalHexes / 6))
}

const MIN_HOPS_TO_CHANGER = 2

interface SolveStep {
  id: string
  dir: Direction
  remainingSnapshot: Set<string>
}

/**
 * Generates a guaranteed-solvable board using a "peel from outside in" strategy.
 */
export function generateSolvableBoard(
  radius = 2,
  changerCount = changerCountForRadius(radius),
): Board {
  const { nodes, nodeMap } = buildGridStructure(radius)

  const interiorIds = nodes
    .filter(n => ALL_DIRECTIONS.every(d => n.neighbors[d] !== null))
    .map(n => n.id)

  const actualCount = Math.min(changerCount, interiorIds.length)

  for (;;) {
    const changerMap: ChangerMap = {}
    const shuffled = [...interiorIds].sort(() => Math.random() - 0.5)
    const changerPositions = new Set(shuffled.slice(0, actualCount))
    for (const id of changerPositions) {
      changerMap[id] = pickRandom(ALL_DIRECTIONS)
    }

    const playableNodes = nodes.filter(n => !changerPositions.has(n.id))
    const remaining = new Set(playableNodes.map(n => n.id))
    const solveOrder: SolveStep[] = []
    let stuck = false

    while (remaining.size > 0) {
      const peelable: { id: string; dirs: Direction[] }[] = []
      for (const id of remaining) {
        const dirs = getEscapeDirs(id, remaining, nodeMap, changerMap)
        if (dirs.length > 0) peelable.push({ id, dirs })
      }

      if (peelable.length === 0) { stuck = true; break }

      const chosen = pickRandom(peelable)
      const dir = pickInwardDir(chosen.id, chosen.dirs, nodeMap)
      solveOrder.push({ id: chosen.id, dir, remainingSnapshot: new Set(remaining) })
      remaining.delete(chosen.id)
    }

    if (stuck) continue

    const anyChangerUsed = solveOrder.some(({ id, dir, remainingSnapshot }) =>
      traceHopsToChanger(id, dir, remainingSnapshot, nodeMap, changerMap) >= MIN_HOPS_TO_CHANGER
    )
    if (!anyChangerUsed) continue

    for (const { id, dir } of solveOrder) {
      const node = nodeMap[id]
      if (node) {
        node.arrowDirection = dir
        node.color = DIRECTION_COLOUR[dir]
      }
    }

    return { nodes, nodeMap, changerMap, playableNodes }
  }
}

function traceHopsToChanger(
  nodeId: string,
  dir: Direction,
  remaining: Set<string>,
  nodeMap: NodeMap,
  changerMap: ChangerMap,
): number {
  let currentDir = dir
  const startNode = nodeMap[nodeId]
  if (!startNode) return -1
  let currentId = startNode.neighbors[currentDir]
  let hops = 0

  while (currentId !== null) {
    if (remaining.has(currentId) && currentId !== nodeId) return -1
    hops++
    if (changerMap[currentId] && changerMap[currentId] !== currentDir) return hops
    const nextNode = nodeMap[currentId]
    currentId = nextNode ? nextNode.neighbors[currentDir] : null
  }
  return -1
}

/**
 * Picks a direction biased toward the board center using dot-product scoring.
 */
function pickInwardDir(nodeId: string, dirs: Direction[], nodeMap: NodeMap): Direction {
  if (dirs.length === 1) return dirs[0]!

  const node = nodeMap[nodeId]!
  const toCenterQ = -node.q
  const toCenterR = -node.r

  const scored = dirs.map(d => {
    const { dq, dr } = AXIAL_OFFSETS[d]
    return { dir: d, score: dq * toCenterQ + dr * toCenterR }
  })

  scored.sort((a, b) => b.score - a.score)
  const bestScore = scored[0]!.score
  const best = scored.filter(s => s.score === bestScore)
  return pickRandom(best).dir
}

function getEscapeDirs(
  nodeId: string,
  remaining: Set<string>,
  nodeMap: NodeMap,
  changerMap: ChangerMap,
): Direction[] {
  const node = nodeMap[nodeId]
  if (!node) return []
  return ALL_DIRECTIONS.filter(dir => {
    let currentDir: Direction = dir
    let currentId = node.neighbors[currentDir]
    const visited = new Set<string>()
    while (currentId !== null) {
      if (remaining.has(currentId)) return false
      const changerDir = changerMap[currentId]
      if (changerDir && changerDir !== currentDir) {
        if (visited.has(currentId)) return false
        visited.add(currentId)
        currentDir = changerDir
      }
      const nextNode = nodeMap[currentId]
      currentId = nextNode ? nextNode.neighbors[currentDir] : null
    }
    return true
  })
}
