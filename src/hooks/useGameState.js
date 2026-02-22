import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { generateSolvableBoard } from '../utils/boardGenerator'
import { resolveSlide } from '../utils/gameLogic'
import { animateValue } from '../utils/animate'

/* ── Timing (ms) ─────────────────────────────────────────────────── */
const HOP_DURATION   = 220   // one hex-to-hex roll
const FALL_DURATION  = 350   // rolling off the edge + fade
const HIT_FLASH_DUR  = 180   // white flash on collision
const RETURN_HOP_DUR = 180   // each hop on the way back (slightly faster)

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

  /* ── Helper: animate a sequence of hops ────────────────────────── */
  const animateHops = useCallback((nodeId, totalHops, stepX, stepY, perHopDur, onHopFrame, onAllDone) => {
    let hop = 0
    const doHop = () => {
      if (hop >= totalHops) { onAllDone(); return }
      const currentHop = hop
      animateValue(perHopDur, (t) => {
        onHopFrame(currentHop, t)
      }, () => {
        hop++
        doHop()
      })
    }
    doHop()
  }, [])

  const handleHexClick = useCallback((node) => {
    if (animating.current) return
    if (!activeIds.has(node.id)) return

    const result = resolveSlide(node, nodeMap, activeIds)
    if (!result) return

    animating.current = true
    const { path } = result

    // Compute pixel step per hop from the board geometry
    // We need the same hexToPixel logic as HexBoard. We'll compute the
    // delta from the node's position to its first neighbor in the path.
    const stepPixel = computeStepPixel(node, path, nodeMap)

    if (result.result === 'escape') {
      const boardHops = path.length
      const totalRollHops = boardHops // roll across board spaces

      // Phase 1: roll across board
      animateHops(node.id, totalRollHops, stepPixel.x, stepPixel.y, HOP_DURATION,
        (currentHop, t) => {
          setAnimStates(new Map([[node.id, {
            state: 'rolling',
            data: { totalHops: totalRollHops, currentHop, hopProgress: t, stepX: stepPixel.x, stepY: stepPixel.y },
          }]]))
        },
        () => {
          // Phase 2: one more hop rolling off the edge + fade
          const fallHop = totalRollHops
          animateValue(FALL_DURATION, (t) => {
            setAnimStates(new Map([[node.id, {
              state: 'falling',
              data: { totalHops: totalRollHops + 1, currentHop: fallHop, hopProgress: t, stepX: stepPixel.x, stepY: stepPixel.y },
            }]]))
          }, () => {
            setActiveIds(prev => {
              const next = new Set(prev)
              next.delete(node.id)
              return next
            })
            setAnimStates(new Map([[node.id, { state: 'gone', data: {} }]]))
            animating.current = false
          })
        }
      )
    } else if (result.result === 'blocked') {
      const forwardHops = path.length // spaces before the blocker

      if (forwardHops === 0) {
        // Immediately adjacent — just flash and stay
        animateValue(HIT_FLASH_DUR, (t) => {
          const flashT = t < 0.5 ? t * 2 : (1 - t) * 2
          setAnimStates(new Map([[node.id, {
            state: 'hit',
            data: { hitAtHops: 0, flashT, stepX: stepPixel.x, stepY: stepPixel.y },
          }]]))
        }, () => {
          setAnimStates(new Map())
          animating.current = false
        })
        return
      }

      // Phase 1: roll forward to the space just before the blocker
      animateHops(node.id, forwardHops, stepPixel.x, stepPixel.y, HOP_DURATION,
        (currentHop, t) => {
          setAnimStates(new Map([[node.id, {
            state: 'rolling',
            data: { totalHops: forwardHops, currentHop, hopProgress: t, stepX: stepPixel.x, stepY: stepPixel.y },
          }]]))
        },
        () => {
          // Phase 2: flash white at the collision point
          animateValue(HIT_FLASH_DUR, (t) => {
            const flashT = t < 0.5 ? t * 2 : (1 - t) * 2
            setAnimStates(new Map([[node.id, {
              state: 'hit',
              data: { hitAtHops: forwardHops, flashT, stepX: stepPixel.x, stepY: stepPixel.y },
            }]]))
          }, () => {
            // Phase 3: roll back to start
            const backStepX = -stepPixel.x
            const backStepY = -stepPixel.y
            animateHops(node.id, forwardHops, backStepX, backStepY, RETURN_HOP_DUR,
              (currentHop, t) => {
                // Offset so we start from the collision point
                const baseX = stepPixel.x * forwardHops
                const baseY = stepPixel.y * forwardHops
                setAnimStates(new Map([[node.id, {
                  state: 'returning',
                  data: {
                    totalHops: forwardHops,
                    currentHop,
                    hopProgress: t,
                    stepX: backStepX,
                    stepY: backStepY,
                    baseOffsetX: baseX,
                    baseOffsetY: baseY,
                  },
                }]]))
              },
              () => {
                setAnimStates(new Map())
                animating.current = false
              }
            )
          })
        }
      )
    }
  }, [activeIds, nodeMap, animateHops])

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


/* ── Compute pixel offset for one hop in the slide direction ─────
 * Uses the same hexToPixel math as HexBoard (gap-aware).
 * If path has at least one node, we use the actual coordinate delta.
 * Otherwise we fall back to the direction unit vector × spacing.    */
function computeStepPixel(node, path, nodeMap, hexSize = 30) {
  const gapX = 12
  const gapY = gapX * (Math.sqrt(3) / 2)
  const w = hexSize * 2 + gapX
  const h = hexSize * Math.sqrt(3) + gapY

  function hexToPixel(q, r) {
    return {
      x: w * (3 / 4) * q,
      y: h * (r + q / 2),
    }
  }

  if (path.length > 0) {
    const from = hexToPixel(node.q, node.r)
    const toNode = nodeMap[path[0]]
    const to = hexToPixel(toNode.q, toNode.r)
    return { x: to.x - from.x, y: to.y - from.y }
  }

  // Fallback: compute step from axial offset for this direction
  const AXIAL = {
    N:  { dq:  0, dr: -1 },
    NE: { dq:  1, dr: -1 },
    SE: { dq:  1, dr:  0 },
    S:  { dq:  0, dr:  1 },
    SW: { dq: -1, dr:  1 },
    NW: { dq: -1, dr:  0 },
  }
  const off = AXIAL[node.arrowDirection] || { dq: 0, dr: 0 }
  const from = hexToPixel(node.q, node.r)
  const to = hexToPixel(node.q + off.dq, node.r + off.dr)
  return { x: to.x - from.x, y: to.y - from.y }
}
