import { ALL_DIRECTIONS } from './hexDirections'
import { buildGridStructure } from './hexGraph'
import { pickRandom, shuffle } from './helpers'
import { DIRECTION_COLOUR } from '../theme'

/**
 * Generates a board that is 100% guaranteed solvable — no cycles, ever.
 *
 * Strategy: "peel from the outside in"
 *
 * We figure out a valid solve order first, then assign arrows to match.
 *
 * A node is "peelable" if it has at least one direction where the path
 * to the board edge doesn't pass through any other remaining node.
 * Boundary nodes are always peelable (they can point off the edge).
 *
 * We repeatedly peel a random peelable node from the remaining set,
 * recording which direction it can escape. This is exactly what the
 * player will do during gameplay. After peeling all nodes, we have a
 * guaranteed valid solve order with escape directions.
 *
 * This always terminates because on a hex grid, the outermost layer
 * of remaining nodes always has peelable nodes — they sit on the
 * convex hull of the remaining set and have clear paths to the edge.
 *
 * For interesting gameplay, we add variety by shuffling which peelable
 * node we pick and randomizing among its valid escape directions.
 */
export function generateSolvableBoard(radius = 2) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  const remaining = new Set(nodes.map(n => n.id))
  const solveOrder = [] // [{id, dir}] — the order nodes are removed

  while (remaining.size > 0) {
    // Find all peelable nodes: those with at least one escape direction
    // that doesn't pass through any other remaining node
    const peelable = []
    for (const id of remaining) {
      const dirs = getEscapeDirs(id, remaining, nodeMap)
      if (dirs.length > 0) {
        peelable.push({ id, dirs })
      }
    }

    // Pick a random peelable node and a random valid direction
    const chosen = pickRandom(peelable)
    const dir = pickRandom(chosen.dirs)

    solveOrder.push({ id: chosen.id, dir })
    remaining.delete(chosen.id)
  }

  // Assign arrows and colours based on the solve order
  for (const { id, dir } of solveOrder) {
    nodeMap[id].arrowDirection = dir
    nodeMap[id].color = DIRECTION_COLOUR[dir]
  }

  return { nodes, nodeMap }
}

/**
 * Returns directions where a node can slide to the board edge
 * without passing through any other node in the `remaining` set.
 */
function getEscapeDirs(nodeId, remaining, nodeMap) {
  const node = nodeMap[nodeId]
  return ALL_DIRECTIONS.filter(dir => {
    let currentId = node.neighbors[dir]
    while (currentId !== null) {
      if (remaining.has(currentId)) return false
      currentId = nodeMap[currentId].neighbors[dir]
    }
    return true
  })
}
