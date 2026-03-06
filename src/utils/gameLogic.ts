import type { HexNodeData, NodeMap, ChangerMap, SlideResult, SlideSegment, Direction } from '../types'

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
export function resolveSlide(
  node: HexNodeData,
  nodeMap: NodeMap,
  activeNodeIds: Set<string>,
  changerMap: ChangerMap = {},
): SlideResult | null {
  const dir = node.arrowDirection
  if (!dir) return null

  const path: string[] = []
  const segments: SlideSegment[] = []
  let currentDir: Direction = dir
  let segCount = 0
  let currentId = node.neighbors[currentDir]
  const visited = new Set<string>()

  while (currentId !== null) {
    if (activeNodeIds.has(currentId)) {
      if (segCount > 0) segments.push({ dir: currentDir, count: segCount })
      return { result: 'blocked', blockedById: currentId, path, segments }
    }

    path.push(currentId)
    segCount++

    const changerDir = changerMap[currentId]
    if (changerDir && changerDir !== currentDir) {
      if (visited.has(currentId)) break
      visited.add(currentId)
      segments.push({ dir: currentDir, count: segCount })
      currentDir = changerDir
      segCount = 0
    }

    const nextNode = nodeMap[currentId]
    currentId = nextNode ? nextNode.neighbors[currentDir] : null
  }

  if (segCount > 0) segments.push({ dir: currentDir, count: segCount })
  return { result: 'escape', path, segments }
}
