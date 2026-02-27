import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { generateSolvableBoard } from '../utils/boardGenerator'
import { resolveSlide } from '../utils/gameLogic'
import { createLayout } from '../utils/hexLayout'
import { orchestrateEscape, orchestrateBlocked } from './animationOrchestrator'

export function useGameState(radius = 2, hexSize = 30) {
  const [gameKey, setGameKey] = useState(0)

  const board = useMemo(
    () => generateSolvableBoard(radius),
    [gameKey, radius],
  )

  const initialArrows = useMemo(
    () => new Map(board.playableNodes.map(n => [n.id, n.arrowDirection])),
    [board.playableNodes],
  )

  const [activeIds, setActiveIds] = useState(() => new Set(board.playableNodes.map(n => n.id)))
  const [animStates, setAnimStates] = useState(new Map())
  const animatingIds = useRef(new Set())
  const [animCount, setAnimCount] = useState(0)

  const layout = useMemo(() => createLayout(hexSize), [hexSize])

  useEffect(() => {
    setActiveIds(new Set(board.playableNodes.map(n => n.id)))
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [board.playableNodes])

  const setNodeAnim = useCallback((nodeId, value) => {
    setAnimStates(prev => {
      const next = new Map(prev)
      if (value === null) next.delete(nodeId)
      else next.set(nodeId, value)
      return next
    })
  }, [])

  const markAnimating = useCallback((nodeId) => {
    animatingIds.current.add(nodeId)
    setAnimCount(animatingIds.current.size)
  }, [])

  const clearAnimating = useCallback((nodeId) => {
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

  const handleHexClick = useCallback((node) => {
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
        setNodeAnim, () => clearAnimating(node.id),
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
