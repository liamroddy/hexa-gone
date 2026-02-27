import { ALL_DIRECTIONS, AXIAL_OFFSETS } from './hexDirections'
import { buildGridStructure } from './hexGraph'
import { pickRandom } from './helpers'
import { DIRECTION_COLOUR } from '../theme'

/**
 * Scale direction-changer count with board size.
 * radius 2 → 3 changers (original), radius 3 → 5, radius 4 → 8, etc.
 */
export function changerCountForRadius(radius) {
  if (radius <= 2) return 3
  // Roughly: 1 changer per 6 hexes, minimum 3
  const totalHexes = 3 * radius * radius + 3 * radius + 1
  return Math.max(3, Math.round(totalHexes / 6))
}

/** Minimum hops before hitting a changer for it to count as "interesting" */
const MIN_HOPS_TO_CHANGER = 2

/**
 * Generates a board that is 100% guaranteed solvable — no cycles, ever.
 *
 * Strategy: "peel from the outside in"
 *
 * Direction changers are placed only on interior (landlocked) hexes.
 * After solving, we verify at least one node's escape path actually
 * routes through a direction changer (with ≥ MIN_HOPS_TO_CHANGER hops
 * before reaching it) so changers are meaningful gameplay elements.
 * If not, we retry with a fresh layout.
 */
export function generateSolvableBoard(radius = 2, changerCount = changerCountForRadius(radius)) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  // Interior hexes: those with a neighbor in every direction (not on the edge)
  const interiorIds = nodes
    .filter(n => ALL_DIRECTIONS.every(d => n.neighbors[d] !== null))
    .map(n => n.id)

  const actualCount = Math.min(changerCount, interiorIds.length)

  // Retry loop — keep trying until solvable AND at least one changer is used
  for (let attempt = 0; ; attempt++) {
    const changerMap = {}
    const shuffled = [...interiorIds].sort(() => Math.random() - 0.5)
    const changerPositions = new Set(shuffled.slice(0, actualCount))
    for (const id of changerPositions) {
      changerMap[id] = pickRandom(ALL_DIRECTIONS)
    }

    const playableNodes = nodes.filter(n => !changerPositions.has(n.id))
    const remaining = new Set(playableNodes.map(n => n.id))
    const solveOrder = [] // [{id, dir, snapshot}] — snapshot = remaining set at peel time
    let stuck = false

    while (remaining.size > 0) {
      const peelable = []
      for (const id of remaining) {
        const dirs = getEscapeDirs(id, remaining, nodeMap, changerMap)
        if (dirs.length > 0) {
          peelable.push({ id, dirs })
        }
      }

      if (peelable.length === 0) {
        stuck = true
        break
      }

      const chosen = pickRandom(peelable)
      const dir = pickInwardDir(chosen.id, chosen.dirs, nodeMap)
      // Snapshot the remaining set so we can retrace the path later
      solveOrder.push({ id: chosen.id, dir, remainingSnapshot: new Set(remaining) })
      remaining.delete(chosen.id)
    }

    if (stuck) continue

    // Check: does at least one node's escape path pass through a changer
    // with enough distance to be interesting?
    let anyChangerUsed = false
    for (const { id, dir, remainingSnapshot } of solveOrder) {
      const hopsBeforeChanger = traceHopsToChanger(id, dir, remainingSnapshot, nodeMap, changerMap)
      if (hopsBeforeChanger >= MIN_HOPS_TO_CHANGER) {
        anyChangerUsed = true
        break
      }
    }

    if (!anyChangerUsed) continue // retry — changers aren't being used

    // Assign arrows and colours based on the solve order
    for (const { id, dir } of solveOrder) {
      nodeMap[id].arrowDirection = dir
      nodeMap[id].color = DIRECTION_COLOUR[dir]
    }

    return { nodes, nodeMap, changerMap, playableNodes }
  }
}

/**
 * Trace a node's escape path and return the number of hops before
 * it first hits a direction changer. Returns -1 if the path never
 * crosses a changer.
 */
function traceHopsToChanger(nodeId, dir, remaining, nodeMap, changerMap) {
  const node = nodeMap[nodeId]
  let currentDir = dir
  let currentId = node.neighbors[currentDir]
  let hops = 0

  while (currentId !== null) {
    if (remaining.has(currentId) && currentId !== nodeId) return -1
    hops++
    if (changerMap[currentId] && changerMap[currentId] !== currentDir) {
      return hops // how many hops before hitting this changer
    }
    currentId = nodeMap[currentId].neighbors[currentDir]
  }
  return -1 // never hit a changer
}

/**
 * Pick a direction from `dirs` biased toward the board center.
 *
 * For each candidate direction we compute a dot-product between the
 * direction's axial offset and the vector pointing from the node
 * toward the center (0,0).  Directions that point more "inward" get
 * a higher score.  We pick randomly among the top-scoring directions
 * so there's still variety, but the solver strongly prefers inward
 * paths first (e.g. SE for a top-left node).
 */
function pickInwardDir(nodeId, dirs, nodeMap) {
  if (dirs.length === 1) return dirs[0]

  const node = nodeMap[nodeId]
  // Vector toward center: negate the node's position
  const toCenterQ = -node.q
  const toCenterR = -node.r

  // Score each direction by how well it aligns with the center vector
  const scored = dirs.map(d => {
    const { dq, dr } = AXIAL_OFFSETS[d]
    const dot = dq * toCenterQ + dr * toCenterR
    return { dir: d, score: dot }
  })

  scored.sort((a, b) => b.score - a.score)
  const bestScore = scored[0].score
  const best = scored.filter(s => s.score === bestScore)
  return pickRandom(best).dir
}

/**
 * Returns directions where a node can slide to the board edge
 * without passing through any other node in the `remaining` set.
 * Simulates direction changers: if the path crosses a changer
 * on an empty space, the direction redirects accordingly.
 */
function getEscapeDirs(nodeId, remaining, nodeMap, changerMap) {
  const node = nodeMap[nodeId]
  return ALL_DIRECTIONS.filter(dir => {
    let currentDir = dir
    let currentId = node.neighbors[currentDir]
    const visited = new Set() // cycle guard for changers
    while (currentId !== null) {
      if (remaining.has(currentId)) return false
      // If this empty space has a direction changer, redirect
      if (changerMap[currentId] && changerMap[currentId] !== currentDir) {
        if (visited.has(currentId)) return false // changer loop
        visited.add(currentId)
        currentDir = changerMap[currentId]
      }
      currentId = nodeMap[currentId].neighbors[currentDir]
    }
    return true
  })
}
