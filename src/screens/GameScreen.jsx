import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import HexBoard from '../components/HexBoard'
import { generateSolvableBoard, resolveSlide } from '../utils/hexUtils'

const ANIM_DURATION_SLIDE = 500   // ms for escape slide
const ANIM_DURATION_BLOCKED = 400 // ms for blocked bounce

export default function GameScreen({ onBack }) {
  const [gameKey, setGameKey] = useState(0)
  const { nodes, nodeMap } = useMemo(() => generateSolvableBoard(2), [gameKey])

  // Snapshot of initial arrow directions for retry
  const initialArrows = useMemo(
    () => new Map(nodes.map(n => [n.id, n.arrowDirection])),
    [gameKey] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Set of node IDs still active on the board
  const [activeIds, setActiveIds] = useState(
    () => new Set(nodes.map(n => n.id))
  )

  // Animation states: Map<nodeId, { state, progress }>
  const [animStates, setAnimStates] = useState(new Map())

  // Prevent clicks during animation
  const animating = useRef(false)

  // Reset board state when a new game starts
  useEffect(() => {
    setActiveIds(new Set(nodes.map(n => n.id)))
    setAnimStates(new Map())
    animating.current = false
  }, [gameKey])

  const handleNewGame = useCallback(() => {
    setGameKey(k => k + 1)
  }, [])

  const handleRetry = useCallback(() => {
    // Restore original arrow directions then reset active state
    for (const node of nodes) {
      node.arrowDirection = initialArrows.get(node.id)
    }
    setActiveIds(new Set(nodes.map(n => n.id)))
    setAnimStates(new Map())
    animating.current = false
  }, [nodes, initialArrows])

  /** Animate a value from 0→1 over `duration` ms, calling `onFrame` each tick. */
  const animate = useCallback((duration, onFrame, onDone) => {
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      onFrame(t)
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        onDone?.()
      }
    }
    requestAnimationFrame(step)
  }, [])

  const handleHexClick = useCallback((node) => {
    if (animating.current) return
    if (!activeIds.has(node.id)) return

    const result = resolveSlide(node, nodeMap, activeIds)
    if (!result) return

    animating.current = true

    if (result.result === 'escape') {
      // Slide off the board then disappear
      animate(
        ANIM_DURATION_SLIDE,
        (t) => {
          setAnimStates(new Map([[node.id, { state: 'sliding', progress: t }]]))
        },
        () => {
          // Remove from active set
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
      // Bounce back with red flash
      animate(
        ANIM_DURATION_BLOCKED,
        (t) => {
          setAnimStates(new Map([[node.id, { state: 'blocked', progress: t }]]))
        },
        () => {
          setAnimStates(new Map())
          animating.current = false
        }
      )
    }
  }, [activeIds, nodeMap, animate])

  const isWon = activeIds.size === 0

  return (
    <div className="screen game-screen">
      <HexBoard
        nodes={nodes}
        hexSize={30}
        onHexClick={handleHexClick}
        animStates={animStates}
        activeIds={activeIds}
      />
      <p className="pieces-left">{activeIds.size} pieces remaining</p>
      <div className="bottom-buttons">
        <button className="btn btn-retry" onClick={handleRetry}>Retry</button>
        <button className="btn btn-back" onClick={onBack}>Back</button>
      </div>

      {isWon && (
        <div className="modal-overlay" onClick={handleNewGame}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <p className="win-message">Congrats, board cleared!</p>
            <div className="modal-buttons">
              <button className="btn btn-new-game" onClick={handleNewGame}>New Game</button>
              <button className="btn btn-retry" onClick={handleRetry}>Retry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
