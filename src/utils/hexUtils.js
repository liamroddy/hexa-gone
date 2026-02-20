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
 * Find all valid (escapable) directions for a node.
 * A direction is valid if walking that way reaches the board edge
 * without hitting any already-assigned node.
 */
function getEscapeDirs(node, nodeMap) {
  return ALL_DIRECTIONS.filter(dir => canEscape(node, dir, nodeMap))
}

/**
 * Solvable board generation algorithm.
 *
 * Key invariant: assignment order is the reverse of solve order.
 * The first node assigned will be the last one solved (removed).
 * So when we assign a node, its path must be clear of all
 * previously-assigned nodes (those will still be on the board
 * when this node is finally played).
 *
 * To guarantee termination, we only ever pick from nodes that
 * currently have at least one escapable direction. This is always
 * non-empty: among the unassigned nodes, those on the boundary
 * of the "assigned region" will always have at least one direction
 * that leads through only unassigned nodes to the board edge.
 *
 * We use clusters for interesting gameplay patterns — we
 * prefer to pick adjacent escapable nodes to continue a cluster,
 * but we never pick a node that has zero valid directions.
 *
 * Algorithm:
 * 1. Build the set of "escapable" unassigned nodes (those with ≥1
 *    valid direction given the current assigned state).
 * 2. Pick one (preferring cluster-adjacent if possible).
 * 3. Assign a random valid direction.
 * 4. Update: the newly assigned node may block neighbors' paths,
 *    so recompute which neighbors are still escapable.
 * 5. Repeat until all nodes are assigned.
 */
export function generateSolvableBoard(radius = 2) {
  const { nodes, nodeMap } = buildGridStructure(radius)

  const unassigned = new Set(nodes.map(n => n.id))

  // Cache of escapable directions per unassigned node
  // We'll maintain this incrementally.
  const escapeDirCache = new Map()
  for (const node of nodes) {
    escapeDirCache.set(node.id, getEscapeDirs(node, nodeMap))
  }

  // The "escapable" set: unassigned nodes with at least one valid dir
  const escapable = new Set(
    nodes.filter(n => escapeDirCache.get(n.id).length > 0).map(n => n.id)
  )

  const newClusterSize = () => Math.floor(Math.random() * 10) + 1
  let continuousPieces = newClusterSize()
  let clusterCounter = 0
  let lastAssignedNode = null

  while (unassigned.size > 0) {
    // Pick the next node to assign
    let chosenId = null

    if (lastAssignedNode && clusterCounter < continuousPieces) {
      // Try to continue the cluster: pick an adjacent unassigned
      // node that is currently escapable
      const adjacentEscapable = ALL_DIRECTIONS
        .map(d => lastAssignedNode.neighbors[d])
        .filter(id => id !== null && unassigned.has(id) && escapable.has(id))

      if (adjacentEscapable.length > 0) {
        chosenId = pickRandom(adjacentEscapable)
      }
    }

    if (chosenId === null) {
      // Start a new cluster — pick any escapable node at random
      clusterCounter = 0
      continuousPieces = newClusterSize()

      if (escapable.size > 0) {
        chosenId = pickRandom([...escapable])
      } else {
        // This shouldn't happen on a well-formed hex grid, but as a
        // safety net: pick any remaining unassigned node and give it
        // a direction toward the nearest edge.
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

    // Assign a random valid direction to the chosen node
    const node = nodeMap[chosenId]
    const validDirs = shuffle([...escapeDirCache.get(chosenId)])
    node.arrowDirection = validDirs[0]

    // Bookkeeping
    unassigned.delete(chosenId)
    escapeDirCache.delete(chosenId)
    escapable.delete(chosenId)
    lastAssignedNode = node
    clusterCounter++

    // Update neighbors: the newly assigned node may now block some
    // of their escape paths. Recompute valid dirs for unassigned
    // neighbors (and their line-of-sight nodes in each direction).
    // For correctness we recompute any unassigned node that could
    // have a path passing through the just-assigned node.
    // The efficient approach: walk in each direction from the assigned
    // node and update any unassigned node we encounter.
    for (const dir of ALL_DIRECTIONS) {
      const reverseDir = oppositeDir(dir)
      // Walk in the reverse direction from the assigned node.
      // Any unassigned node along this line had a path going through
      // the assigned node in `dir` — that path is now blocked.
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
