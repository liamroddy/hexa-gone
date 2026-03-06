import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { HexNodeData, AnimEntry, Direction, ChangerMap, NodeMap } from '../types'
import { generateSolvableBoard } from '../utils/boardGenerator'
import { resolveSlide } from '../utils/gameLogic'
import { createLayout } from '../utils/hexLayout'
import { orchestrateEscape, orchestrateBlocked } from './animationOrchestrator'

interface GameState {
  nodes: HexNodeData[]
  nodeMap: NodeMap
  changerMap: ChangerMap
  activeIds: Set<string>
  animStates: Map<string, AnimEntry>
  isWon: boolean
  piecesRemaining: number
  handleHexClick: (node: HexNodeData) => void
  newGame: () => void
  retry: () => void
}

export function useGameState(radius = 2, hexSize = 30): GameState {
  const [gameKey, setGameKey] = useState(0)

  const board = useMemo(
    () => generateSolvableBoard(radius),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameKey, radius],
  )

  const initialArrows = useMemo(
    () => new Map<string, Direction | undefined>(board.playableNodes.map(n => [n.id, n.arrowDirection])),
    [board.playableNodes],
  )

  const [activeIds, setActiveIds] = useState(() => new Set(board.playableNodes.map(n => n.id)))
  const [animStates, setAnimStates] = useState<Map<string, AnimEntry>>(new Map())
  const animatingIds = useRef(new Set<string>())
  const [animCount, setAnimCount] = useState(0)

  const layout = useMemo(() => createLayout(hexSize), [hexSize])

  useEffect(() => {
    setActiveIds(new Set(board.playableNodes.map(n => n.id)))
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [board.playableNodes])

  const setNodeAnim = useCallback((nodeId: string, value: AnimEntry | null) => {
    setAnimStates(prev => {
      const next = new Map(prev)
      if (value === null) next.delete(nodeId)
      else next.set(nodeId, value)
      return next
    })
  }, [])

  const markAnimating = useCallback((nodeId: string) => {
    animatingIds.current.add(nodeId)
    setAnimCount(animatingIds.current.size)
  }, [])

  const clearAnimating = useCallback((nodeId: string) => {
    animatingIds.current.delete(nodeId)
    setAnimCount(animatingIds.current.size)
  }, [])

  const newGame = useCallback(() => setGameKey(k => k + 1), [])

  const retry = useCallback(() => {
    for (const node of board.playableNodes) {
      node.arrowDirection = initialArrows.get(node.id)
    }
    setActiveIds(new Set(board.playableNodes.map(n => n.id)))
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [board.playableNodes, initialArrows])

  const handleHexClick = useCallback((node: HexNodeData) => {
    if (animatingIds.current.has(node.id)) return
    if (!activeIds.has(node.id)) return

    const result = resolveSlide(node, board.nodeMap, activeIds, board.changerMap)
    if (!result) return

    markAnimating(node.id)

    if (result.result === 'escape') {
      setActiveIds(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
      orchestrateEscape(
        node.id, result.segments, layout.stepPixelForDir,
        setNodeAnim, () => clearAnimating(node.id), node.arrowDirection,
      )
    } else if (result.result === 'blocked') {
      orchestrateBlocked(
        node.id, result.segments, layout.stepPixelForDir,
        setNodeAnim, () => clearAnimating(node.id),
      )
    }
  }, [activeIds, board.nodeMap, board.changerMap, layout, setNodeAnim, markAnimating, clearAnimating])

  return {
    nodes: board.nodes,
    nodeMap: board.nodeMap,
    changerMap: board.changerMap,
    activeIds,
    animStates,
    isWon: activeIds.size === 0 && animCount === 0,
    piecesRemaining: activeIds.size,
    handleHexClick,
    newGame,
    retry,
  }
}
