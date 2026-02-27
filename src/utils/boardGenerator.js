import { ALL_DIRECTIONS, AXIAL_OFFSETS } from './hexDirections'
import { buildGridStructure } from './hexGraph'
import { pickRandom } from './helpers'
import { DIRECTION_COLOUR } from '../theme'

export function changerCountForRadius(radius) {
  if (radius <= 2) return 3
  const totalHexes = 3 * radius * radius + 3 * radius + 1
  return Math.max(3, Math.round(totalHexes / 6))
}

const MIN_HOPS_TO_CHANGER = 2

/**
 * Generates a guaranteed-solvable board using a "peel from outside in" strategy.
 *
 * Direction changers are placed on interior hexes only. The generator retries
 * until at least one node's escape path meaningfully routes through a changer
 * (with >= MIN_HOPS_TO_CHANGER hops before reaching it).
 */
export function generateSolvableBoard(radius = 2, changerCount = changerCountForRadius(radius)) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  const interiorIds = nodes
    .filter(n => ALL_DIRECTIONS.every(d => n.neighbors[d] !== null))
    .map(n => n.id)

  const actualCount = Math.min(changerCount, interiorIds.length)

  for (;;) {
    const changerMap = {}
    const shuffled = [...interiorIds].sort(() => Math.random() - 0.5)
    const changerPositions = new Set(shuffled.slice(0, actualCount))
    for (const id of changerPositions) {
      changerMap[id] = pickRandom(ALL_DIRECTIONS)
    }

    const playableNodes = nodes.filter(n => !changerPositions.has(n.id))
    const remaining = new Set(playableNodes.map(n => n.id))
    const solveOrder = []
    let stuck = false

    while (remaining.size > 0) {
      const peelable = []
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
      nodeMap[id].arrowDirection = dir
      nodeMap[id].color = DIRECTION_COLOUR[dir]
    }

    return { nodes, nodeMap, changerMap, playableNodes }
  }
}

function traceHopsToChanger(nodeId, dir, remaining, nodeMap, changerMap) {
  let currentDir = dir
  let currentId = nodeMap[nodeId].neighbors[currentDir]
  let hops = 0

  while (currentId !== null) {
    if (remaining.has(currentId) && currentId !== nodeId) return -1
    hops++
    if (changerMap[currentId] && changerMap[currentId] !== currentDir) return hops
    currentId = nodeMap[currentId].neighbors[currentDir]
  }
  return -1
}

/**
 * Picks a direction biased toward the board center using dot-product scoring
 * against the vector from the node toward (0,0).
 */
function pickInwardDir(nodeId, dirs, nodeMap) {
  if (dirs.length === 1) return dirs[0]

  const node = nodeMap[nodeId]
  const toCenterQ = -node.q
  const toCenterR = -node.r

  const scored = dirs.map(d => {
    const { dq, dr } = AXIAL_OFFSETS[d]
    return { dir: d, score: dq * toCenterQ + dr * toCenterR }
  })

  scored.sort((a, b) => b.score - a.score)
  const bestScore = scored[0].score
  const best = scored.filter(s => s.score === bestScore)
  return pickRandom(best).dir
}

function getEscapeDirs(nodeId, remaining, nodeMap, changerMap) {
  const node = nodeMap[nodeId]
  return ALL_DIRECTIONS.filter(dir => {
    let currentDir = dir
    let currentId = node.neighbors[currentDir]
    const visited = new Set()
    while (currentId !== null) {
      if (remaining.has(currentId)) return false
      if (changerMap[currentId] && changerMap[currentId] !== currentDir) {
        if (visited.has(currentId)) return false
        visited.add(currentId)
        currentDir = changerMap[currentId]
      }
      currentId = nodeMap[currentId].neighbors[currentDir]
    }
    return true
  })
}
