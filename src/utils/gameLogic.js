/**
 * Determine what happens when a node tries to slide in its arrow direction.
 *
 * Returns:
 *  - { result: 'escape' } — slides off the board edge
 *  - { result: 'blocked', blockedById } — hits an active node, bounces back
 *  - null — node has no arrow direction
 */
export function resolveSlide(node, nodeMap, activeNodeIds) {
  const dir = node.arrowDirection
  if (!dir) return null

  let currentId = node.neighbors[dir]

  while (currentId !== null) {
    if (activeNodeIds.has(currentId)) {
      return { result: 'blocked', blockedById: currentId }
    }
    currentId = nodeMap[currentId].neighbors[dir]
  }

  return { result: 'escape' }
}
