import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { generateSolvableBoard } from '../utils/boardGenerator'
import { resolveSlide } from '../utils/gameLogic'
import { animateValue } from '../utils/animate'

const ANIM_DURATION_SLIDE = 500
const ANIM_DURATION_BLOCKED = 400

export function useGameState(radius = 2) {
  const [gameKey, setGameKey] = useState(0)
  const { nodes, nodeMap } = useMemo(() => generateSolvableBoard(radius), [gameKey, radius])

  const initialArrows = useMemo(
    () => new Map(nodes.map(n => [n.id, n.arrowDirection])),
    [nodes]
  )

  const [activeIds, setActiveIds] = useState(() => new Set(nodes.map(n => n.id)))
  const [animStates, setAnimStates] = useState(new Map())
  const animating = useRef(false)

  useEffect(() => {
    setActiveIds(new Set(nodes.map(n => n.id)))
    setAnimStates(new Map())
    animating.current = false
  }, [nodes])

  const newGame = useCallback(() => setGameKey(k => k + 1), [])

  const retry = useCallback(() => {
    for (const node of nodes) {
      node.arrowDirection = initialArrows.get(node.id)
    }
    setActiveIds(new Set(nodes.map(n => n.id)))
    setAnimStates(new Map())
    animating.current = false
  }, [nodes, initialArrows])


  const handleHexClick = useCallback((node) => {
    if (animating.current) return
    if (!activeIds.has(node.id)) return

    const result = resolveSlide(node, nodeMap, activeIds)
    if (!result) return

    animating.current = true

    if (result.result === 'escape') {
      animateValue(
        ANIM_DURATION_SLIDE,
        (t) => setAnimStates(new Map([[node.id, { state: 'sliding', progress: t }]])),
        () => {
          setActiveIds(prev => {
            const next = new Set(prev)
            next.delete(node.id)
            return next
          })
          setAnimStates(new Map([[node.id, { state: 'gone', progress: 1 }]]))
          animating.current = false
        }
      )
    } else if (result.result === 'blocked') {
      animateValue(
        ANIM_DURATION_BLOCKED,
        (t) => setAnimStates(new Map([[node.id, { state: 'blocked', progress: t }]])),
        () => {
          setAnimStates(new Map())
          animating.current = false
        }
      )
    }
  }, [activeIds, nodeMap])

  return {
    nodes,
    nodeMap,
    activeIds,
    animStates,
    isWon: activeIds.size === 0,
    piecesRemaining: activeIds.size,
    handleHexClick,
    newGame,
    retry,
  }
}
