import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { HexNodeData, AnimEntry, Direction, ChangerMap, BombMap, NodeMap } from '../types'
import { generateSolvableBoard } from '../utils/boardGenerator'
import { resolveSlide } from '../utils/gameLogic'
import { createLayout } from '../utils/hexLayout'
import { ALL_DIRECTIONS } from '../utils/hexDirections'
import { orchestrateEscape, orchestrateBlocked, orchestrateBomb } from './animationOrchestrator'

interface GameState {
  nodes: HexNodeData[]
  nodeMap: NodeMap
  changerMap: ChangerMap
  bombMap: BombMap
  activeIds: Set<string>
  animStates: Map<string, AnimEntry>
  isWon: boolean
  isGameOver: boolean
  piecesRemaining: number
  movesRemaining: number
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

  // Move counter = minimum moves needed (accounts for bomb blast victims)
  const initialMoves = board.minMoves
  const [activeIds, setActiveIds] = useState(() => new Set(board.playableNodes.map(n => n.id)))
  const [bombIds, setBombIds] = useState(() => new Set(board.bombMap))
  const [movesRemaining, setMovesRemaining] = useState(initialMoves)
  const [animStates, setAnimStates] = useState<Map<string, AnimEntry>>(new Map())
  const animatingIds = useRef(new Set<string>())
  const [animCount, setAnimCount] = useState(0)

  const layout = useMemo(() => createLayout(hexSize), [hexSize])

  useEffect(() => {
    setActiveIds(new Set(board.playableNodes.map(n => n.id)))
    setBombIds(new Set(board.bombMap))
    setMovesRemaining(board.minMoves)
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [board.playableNodes, board.bombMap])

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
    setBombIds(new Set(board.bombMap))
    setMovesRemaining(board.minMoves)
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [board.playableNodes, board.bombMap, initialArrows])

  const handleHexClick = useCallback((node: HexNodeData) => {
    if (animatingIds.current.has(node.id)) return
    if (!activeIds.has(node.id)) return
    if (movesRemaining <= 0) return

    const result = resolveSlide(node, board.nodeMap, activeIds, board.changerMap, bombIds)
    if (!result) return

    setMovesRemaining(m => m - 1)
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
    } else if (result.result === 'bomb') {
      // Find all active tiles adjacent to the bomb
      const bombNode = board.nodeMap[result.bombId]
      const blastVictims: string[] = []
      if (bombNode) {
        for (const dir of ALL_DIRECTIONS) {
          const neighborId = bombNode.neighbors[dir]
          if (neighborId && activeIds.has(neighborId) && neighborId !== node.id) {
            blastVictims.push(neighborId)
          }
        }
      }

      // Remove the sliding tile, bomb, and all blast victims from active
      setActiveIds(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        for (const vid of blastVictims) next.delete(vid)
        return next
      })
      // Remove the bomb
      setBombIds(prev => {
        const next = new Set(prev)
        next.delete(result.bombId)
        return next
      })

      // Mark all blast victims and the bomb as animating
      for (const vid of blastVictims) markAnimating(vid)
      markAnimating(result.bombId)

      orchestrateBomb(
        node.id, result.segments, layout.stepPixelForDir,
        setNodeAnim, blastVictims,
        () => {
          clearAnimating(node.id)
          for (const vid of blastVictims) clearAnimating(vid)
          clearAnimating(result.bombId)
        },
        node.arrowDirection,
        result.bombId,
      )
    }
  }, [activeIds, bombIds, movesRemaining, board.nodeMap, board.changerMap, layout, setNodeAnim, markAnimating, clearAnimating])

  return {
    nodes: board.nodes,
    nodeMap: board.nodeMap,
    changerMap: board.changerMap,
    bombMap: bombIds,
    activeIds,
    animStates,
    isWon: activeIds.size === 0 && animCount === 0,
    isGameOver: movesRemaining <= 0 && activeIds.size > 0 && animCount === 0,
    piecesRemaining: activeIds.size,
    movesRemaining,
    handleHexClick,
    newGame,
    retry,
  }
}
