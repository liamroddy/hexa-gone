/** The six hex directions (flat-top orientation). */
export const HexDirection = Object.freeze({
  North:     'N',
  NorthEast: 'NE',
  SouthEast: 'SE',
  South:     'S',
  SouthWest: 'SW',
  NorthWest: 'NW',
})

/** All direction values as an array for convenience. */
export const ALL_DIRECTIONS = Object.values(HexDirection)

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
 * arrowDirection starts as undefined — the board generator assigns it.
 */
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

/** Link two nodes as neighbors in the given direction (sets both sides). */
export function linkNodes(nodeA, dir, nodeB) {
  nodeA.neighbors[dir] = nodeB.id
  nodeB.neighbors[oppositeDir(dir)] = nodeA.id
}

/** Pick a random element from an array. */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Shuffle an array in place (Fisher-Yates). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Check whether a node with a given arrow direction can "escape" the board.
 *
 * Walks from `startNode` in `dir` through the grid:
 *  - If we reach a null neighbor (edge of board / empty space) → valid (can slide off)
 *  - If we hit a node that already has an arrowDirection defined → invalid (blocked)
 *  - If we hit an undefined node, keep walking through it (it's empty space we pass over)
 *
 * Returns true if the path leads off the board without hitting a defined node.
 */
function canEscape(startNode, dir, nodeMap) {
  let currentId = startNode.neighbors[dir]

  while (currentId !== null) {
    const neighbor = nodeMap[currentId]
    // If this neighbor already has an arrow, the path is blocked
    if (neighbor.arrowDirection !== undefined) {
      return false
    }
    // Move to the next node in the same direction
    currentId = neighbor.neighbors[dir]
  }

  // Reached a null neighbor — this edge leads off the board
  return true
}

/**
 * Build the hex grid structure (nodes + links) without assigning arrows.
 * Returns { nodes, nodeMap }.
 */
export function buildGridStructure(radius = 2) {
  const nodes = []
  const coordMap = new Map() // "q,r" -> node

  // Generate axial coords within the given radius
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


/**
 * Solvable board generation algorithm.
 *
 * The idea: we assign arrow directions to every node such that each node
 * has a clear path (following its arrow) off the edge of the board.
 * Nodes are assigned in clusters ("continuous pieces") so nearby nodes
 * get arrows in sequence, creating interesting gameplay patterns.
 *
 * Algorithm:
 * 1. Start with an empty board (all arrowDirections undefined).
 * 2. Pick a random "continuousPieces" count (1–10). This is how many
 *    nodes we'll try to assign in a connected cluster before jumping
 *    to a new random location.
 * 3. Pick a random undefined node.
 * 4. Try assigning a random arrow direction to it.
 * 5. Validate: walk in that direction — if we reach the board edge
 *    without hitting any already-defined node, it's valid.
 * 6. If valid, commit the arrow. Increment the cluster counter.
 * 7. If the cluster isn't full yet, pick an adjacent undefined node
 *    to continue the cluster. If no adjacent undefined node exists,
 *    reset the cluster (pick a new random undefined node).
 * 8. If the cluster is full, reset: new cluster size, pick a new
 *    random undefined node.
 * 9. Repeat until every node has an arrow direction.
 */
export function generateSolvableBoard(radius = 2) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  // Track which nodes still need an arrow direction
  const undefinedSet = new Set(nodes.map(n => n.id))

  // Generate a new cluster size (1 to 10)
  const newClusterSize = () => Math.floor(Math.random() * 10) + 1

  let continuousPieces = newClusterSize()
  let clusterCounter = 0

  // Start with a random undefined node
  let currentNodeId = pickRandom([...undefinedSet])

  while (undefinedSet.size > 0) {
    const currentNode = nodeMap[currentNodeId]

    // Try all 6 directions in random order to find a valid arrow
    const shuffledDirs = shuffle([...ALL_DIRECTIONS])
    let assigned = false

    for (const dir of shuffledDirs) {
      if (canEscape(currentNode, dir, nodeMap)) {
        // Valid direction found — assign it
        currentNode.arrowDirection = dir
        undefinedSet.delete(currentNodeId)
        clusterCounter++
        assigned = true
        break
      }
    }

    if (!assigned) {
      // No valid direction exists for this node right now.
      // This can happen if the node is completely surrounded by defined nodes.
      // Skip it for now and try another undefined node.
      // We'll come back to it — as other nodes get removed during play,
      // paths open up. But for generation, we need a fallback:
      // try a different undefined node instead.
      const remaining = [...undefinedSet].filter(id => id !== currentNodeId)
      if (remaining.length === 0) {
        // Only this node is left and it's stuck — force a direction
        // toward the nearest edge. Pick any direction that has a null
        // neighbor (i.e. is on the board edge).
        const edgeDir = ALL_DIRECTIONS.find(d => currentNode.neighbors[d] === null)
        if (edgeDir) {
          currentNode.arrowDirection = edgeDir
        } else {
          // Fully interior and surrounded — just pick any direction
          currentNode.arrowDirection = pickRandom(ALL_DIRECTIONS)
        }
        undefinedSet.delete(currentNodeId)
        break
      }
      currentNodeId = pickRandom(remaining)
      continue
    }

    // No more undefined nodes? We're done.
    if (undefinedSet.size === 0) break

    // Decide next node: continue cluster or start a new one
    if (clusterCounter < continuousPieces) {
      // Try to pick an adjacent undefined node to keep the cluster going
      const adjacentUndefined = ALL_DIRECTIONS
        .map(d => currentNode.neighbors[d])
        .filter(id => id !== null && undefinedSet.has(id))

      if (adjacentUndefined.length > 0) {
        currentNodeId = pickRandom(adjacentUndefined)
      } else {
        // No adjacent undefined nodes — reset cluster, pick random
        clusterCounter = 0
        continuousPieces = newClusterSize()
        currentNodeId = pickRandom([...undefinedSet])
      }
    } else {
      // Cluster is full — reset and jump to a new random location
      clusterCounter = 0
      continuousPieces = newClusterSize()
      currentNodeId = pickRandom([...undefinedSet])
    }
  }

  return { nodes, nodeMap }
}

/**
 * Gameplay: determine what happens when a node tries to slide in its arrow direction.
 *
 * Returns one of:
 *  - { result: 'escape', path } — node slides off the board (path = list of {x,y} to animate through)
 *  - { result: 'blocked', blockedById } — node hits another defined node, should bounce back
 *
 * A node "escapes" if it can walk in its arrow direction and reach a null edge
 * without encountering any node that is still active (has a defined arrow).
 */
export function resolveSlide(node, nodeMap, activeNodeIds) {
  const dir = node.arrowDirection
  if (!dir) return null

  let currentId = node.neighbors[dir]

  while (currentId !== null) {
    const neighbor = nodeMap[currentId]
    // If this neighbor is still active on the board, we're blocked
    if (activeNodeIds.has(currentId)) {
      return { result: 'blocked', blockedById: currentId }
    }
    // Otherwise keep walking
    currentId = neighbor.neighbors[dir]
  }

  // Reached the edge — node escapes
  return { result: 'escape' }
}
