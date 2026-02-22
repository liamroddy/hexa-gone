/**
 * Determine what happens when a node tries to slide in its arrow direction.
 *
 * Returns:
 *  - { result: 'escape', path: [...ids] } — slides off the board edge
 *  - { result: 'blocked', blockedById, path: [...ids] } — hits an active node
 *  - null — node has no arrow direction
 *
 * `path` contains the IDs of each empty hex traversed (not including the
 * starting hex). For 'blocked', path has the spaces successfully crossed
 * before hitting the blocker.
 */
export function resolveSlide(node, nodeMap, activeNodeIds) {
  const dir = node.arrowDirection
  if (!dir) return null

  const path = []
  let currentId = node.neighbors[dir]

  while (currentId !== null) {
    if (activeNodeIds.has(currentId)) {
      return { result: 'blocked', blockedById: currentId, path }
    }
    path.push(currentId)
    currentId = nodeMap[currentId].neighbors[dir]
  }

  return { result: 'escape', path }
}
