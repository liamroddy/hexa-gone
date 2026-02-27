/**
 * Resolves a hex slide in its arrow direction.
 *
 * Returns:
 *  - { result: 'escape', path, segments } — slides off the board edge
 *  - { result: 'blocked', blockedById, path, segments } — hits an active node
 *  - null — node has no arrow direction
 *
 * `segments` describes direction changes: [{dir, count}, ...] for animation.
 */
export function resolveSlide(node, nodeMap, activeNodeIds, changerMap = {}) {
  const dir = node.arrowDirection
  if (!dir) return null

  const path = []
  const segments = []
  let currentDir = dir
  let segCount = 0
  let currentId = node.neighbors[currentDir]
  const visited = new Set()

  while (currentId !== null) {
    if (activeNodeIds.has(currentId)) {
      if (segCount > 0) segments.push({ dir: currentDir, count: segCount })
      return { result: 'blocked', blockedById: currentId, path, segments }
    }

    path.push(currentId)
    segCount++

    if (changerMap[currentId] && changerMap[currentId] !== currentDir) {
      if (visited.has(currentId)) break
      visited.add(currentId)
      segments.push({ dir: currentDir, count: segCount })
      currentDir = changerMap[currentId]
      segCount = 0
    }

    currentId = nodeMap[currentId].neighbors[currentDir]
  }

  if (segCount > 0) segments.push({ dir: currentDir, count: segCount })
  return { result: 'escape', path, segments }
}
