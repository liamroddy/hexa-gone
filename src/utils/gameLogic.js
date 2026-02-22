/**
 * Determine what happens when a node tries to slide in its arrow direction.
 *
 * Returns:
 *  - { result: 'escape', path: [...ids], segments: [...] } — slides off the board edge
 *  - { result: 'blocked', blockedById, path: [...ids], segments: [...] } — hits an active node
 *  - null — node has no arrow direction
 *
 * `path` contains the IDs of each empty hex traversed (not including the
 * starting hex). For 'blocked', path has the spaces successfully crossed
 * before hitting the blocker.
 *
 * `segments` is an array of { dir, count } describing direction changes
 * caused by changers. E.g. [{dir:'N', count:2}, {dir:'SE', count:3}]
 * means 2 hops north then 3 hops south-east.
 */
export function resolveSlide(node, nodeMap, activeNodeIds, changerMap = {}) {
  const dir = node.arrowDirection
  if (!dir) return null

  const path = []
  const segments = []
  let currentDir = dir
  let segCount = 0
  let currentId = node.neighbors[currentDir]
  const visited = new Set() // cycle guard for changers

  while (currentId !== null) {
    if (activeNodeIds.has(currentId)) {
      if (segCount > 0) segments.push({ dir: currentDir, count: segCount })
      return { result: 'blocked', blockedById: currentId, path, segments }
    }
    path.push(currentId)
    segCount++

    // Check for direction changer on this empty space
    if (changerMap[currentId] && changerMap[currentId] !== currentDir) {
      if (visited.has(currentId)) break // safety: changer loop
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
