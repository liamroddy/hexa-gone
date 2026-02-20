import { ALL_DIRECTIONS, oppositeDir } from './hexDirections'
import { buildGridStructure } from './hexGraph'
import { pickRandom, shuffle } from './helpers'
import { HEX_COLOURS } from '../theme'

function canEscape(startNode, dir, nodeMap) {
  let currentId = startNode.neighbors[dir]
  while (currentId !== null) {
    const neighbor = nodeMap[currentId]
    if (neighbor.arrowDirection !== undefined) return false
    currentId = neighbor.neighbors[dir]
  }
  return true
}

function getEscapeDirs(node, nodeMap) {
  return ALL_DIRECTIONS.filter(dir => canEscape(node, dir, nodeMap))
}

/**
 * Generates a board where every tile is guaranteed to be solvable.
 *
 * The key insight: assignment order is the reverse of solve order.
 * The first node assigned will be the last one removed during play.
 * So when we assign a node's arrow, its escape path must be clear
 * of all previously-assigned nodes (those will still be on the board
 * when this node is finally played).
 *
 * We maintain a set of "escapable" unassigned nodes — those with at
 * least one direction that leads off the board without hitting an
 * already-assigned node. Among unassigned boundary nodes, this set
 * is always non-empty, guaranteeing termination.
 *
 * For interesting gameplay, we assign in clusters: we prefer to pick
 * adjacent escapable nodes before jumping to a random new location.
 *
 * Steps:
 * 1. Build the escapable set (unassigned nodes with ≥1 valid direction).
 * 2. Pick a node (prefer cluster-adjacent, fall back to random).
 * 3. Assign a random valid escape direction.
 * 4. Recompute escape dirs for any unassigned node whose path
 *    passed through the newly-assigned node.
 * 5. Repeat until all nodes are assigned.
 */
export function generateSolvableBoard(radius = 2) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  // Assign random colors
  for (const node of nodes) {
    node.color = pickRandom(HEX_COLOURS)
  }

  const unassigned = new Set(nodes.map(n => n.id))

  const escapeDirCache = new Map()
  for (const node of nodes) {
    escapeDirCache.set(node.id, getEscapeDirs(node, nodeMap))
  }

  const escapable = new Set(
    nodes.filter(n => escapeDirCache.get(n.id).length > 0).map(n => n.id)
  )


  const newClusterSize = () => Math.floor(Math.random() * 10) + 1
  let continuousPieces = newClusterSize()
  let clusterCounter = 0
  let lastAssignedNode = null

  while (unassigned.size > 0) {
    let chosenId = null

    if (lastAssignedNode && clusterCounter < continuousPieces) {
      const adjacentEscapable = ALL_DIRECTIONS
        .map(d => lastAssignedNode.neighbors[d])
        .filter(id => id !== null && unassigned.has(id) && escapable.has(id))

      if (adjacentEscapable.length > 0) {
        chosenId = pickRandom(adjacentEscapable)
      }
    }

    if (chosenId === null) {
      clusterCounter = 0
      continuousPieces = newClusterSize()

      if (escapable.size > 0) {
        chosenId = pickRandom([...escapable])
      } else {
        // Safety fallback — shouldn't happen on a well-formed hex grid
        chosenId = pickRandom([...unassigned])
        const stuck = nodeMap[chosenId]
        const edgeDir = ALL_DIRECTIONS.find(d => stuck.neighbors[d] === null)
        stuck.arrowDirection = edgeDir || pickRandom(ALL_DIRECTIONS)
        unassigned.delete(chosenId)
        escapeDirCache.delete(chosenId)
        escapable.delete(chosenId)
        lastAssignedNode = stuck
        clusterCounter++
        continue
      }
    }

    const node = nodeMap[chosenId]
    const validDirs = shuffle([...escapeDirCache.get(chosenId)])
    node.arrowDirection = validDirs[0]

    unassigned.delete(chosenId)
    escapeDirCache.delete(chosenId)
    escapable.delete(chosenId)
    lastAssignedNode = node
    clusterCounter++

    // Recompute escape dirs for unassigned nodes whose paths
    // passed through the newly-assigned node
    for (const dir of ALL_DIRECTIONS) {
      const reverseDir = oppositeDir(dir)
      let walkId = node.neighbors[reverseDir]
      while (walkId !== null && unassigned.has(walkId)) {
        const walkNode = nodeMap[walkId]
        const newDirs = getEscapeDirs(walkNode, nodeMap)
        escapeDirCache.set(walkId, newDirs)
        if (newDirs.length > 0) {
          escapable.add(walkId)
        } else {
          escapable.delete(walkId)
        }
        walkId = walkNode.neighbors[reverseDir]
      }
    }
  }

  return { nodes, nodeMap }
}
