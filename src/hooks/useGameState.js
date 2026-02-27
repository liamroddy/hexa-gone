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
  const { nodes, nodeMap, changerMap, playableNodes } = useMemo(() => generateSolvableBoard(radius), [gameKey, radius])

  const initialArrows = useMemo(
    () => new Map(playableNodes.map(n => [n.id, n.arrowDirection])),
    [playableNodes]
  )

  const [activeIds, setActiveIds] = useState(() => new Set(playableNodes.map(n => n.id)))
  const [animStates, setAnimStates] = useState(new Map())
  const animatingIds = useRef(new Set())
  const [animCount, setAnimCount] = useState(0)

  useEffect(() => {
    setActiveIds(new Set(playableNodes.map(n => n.id)))
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [playableNodes])

  const newGame = useCallback(() => setGameKey(k => k + 1), [])

  const retry = useCallback(() => {
    for (const node of playableNodes) {
      node.arrowDirection = initialArrows.get(node.id)
    }
    setActiveIds(new Set(playableNodes.map(n => n.id)))
    setAnimStates(new Map())
    animatingIds.current = new Set()
    setAnimCount(0)
  }, [playableNodes, initialArrows])

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

  /* ── Helper: animate multi-segment hops (direction changes) ──── */
  const animateSegments = useCallback((nodeId, segments, nodeMap, perHopDur, onSegHopFrame, onAllDone) => {
    let segIdx = 0
    let globalHop = 0

    const doSegment = () => {
      if (segIdx >= segments.length) { onAllDone(); return }
      const seg = segments[segIdx]
      const stepPixel = computeStepPixelForDir(seg.dir, nodeMap)
      let hop = 0
      const doHop = () => {
        if (hop >= seg.count) { segIdx++; doSegment(); return }
        const currentGlobal = globalHop
        const currentDir = seg.dir
        animateValue(perHopDur, (t) => {
          onSegHopFrame(currentGlobal, t, stepPixel, currentDir)
        }, () => {
          hop++
          globalHop++
          doHop()
        })
      }
      doHop()
    }
    doSegment()
  }, [])

  /* ── Helper: set anim state for a single node (merge into map) ── */
  const setNodeAnim = useCallback((nodeId, value) => {
    setAnimStates(prev => {
      const next = new Map(prev)
      if (value === null) {
        next.delete(nodeId)
      } else {
        next.set(nodeId, value)
      }
      return next
    })
  }, [])

  /* ── Helper: clear anim state for a single node ────────────────── */
  const clearNodeAnim = useCallback((nodeId) => {
    setNodeAnim(nodeId, null)
    animatingIds.current.delete(nodeId)
    setAnimCount(animatingIds.current.size)
  }, [setNodeAnim])

  const handleHexClick = useCallback((node) => {
    if (animatingIds.current.has(node.id)) return
    if (!activeIds.has(node.id)) return

    const result = resolveSlide(node, nodeMap, activeIds, changerMap)
    if (!result) return

    animatingIds.current.add(node.id)
    setAnimCount(animatingIds.current.size)

    // If the node escapes, remove it from activeIds immediately so other
    // nodes can path through its space before the animation finishes.
    if (result.result === 'escape') {
      setActiveIds(prev => {
        const next = new Set(prev)
        next.delete(node.id)
        return next
      })
    }

    const { path, segments } = result

    // Track cumulative pixel offset across segments
    let cumulativeX = 0
    let cumulativeY = 0
    // We need to track the pixel offset at the start of each global hop
    const hopOffsets = [] // [{x, y}] indexed by global hop
    let gHop = 0
    for (const seg of segments) {
      const sp = computeStepPixelForDir(seg.dir, nodeMap)
      for (let i = 0; i < seg.count; i++) {
        hopOffsets.push({ x: cumulativeX, y: cumulativeY, stepX: sp.x, stepY: sp.y, dir: seg.dir })
        cumulativeX += sp.x
        cumulativeY += sp.y
        gHop++
      }
    }
    const totalHops = hopOffsets.length

    // For the initial direction (used for fallback / simple cases)
    const stepPixel = computeStepPixel(node, path, nodeMap)

    if (result.result === 'escape') {
      // Determine the final direction for the fall-off animation
      const fallDir = segments.length > 0 ? segments[segments.length - 1].dir : node.arrowDirection
      const fallStep = computeStepPixelForDir(fallDir, nodeMap)

      const doFall = () => {
        animateValue(FALL_DURATION, (t) => {
          setNodeAnim(node.id, {
            state: 'falling',
            data: {
              totalHops: totalHops + 1,
              currentHop: 0,
              hopProgress: t,
              stepX: fallStep.x,
              stepY: fallStep.y,
              baseOffsetX: cumulativeX,
              baseOffsetY: cumulativeY,
              currentDir: fallDir,
            },
          })
        }, () => {
          setNodeAnim(node.id, { state: 'gone', data: {} })
          animatingIds.current.delete(node.id)
          setAnimCount(animatingIds.current.size)
        })
      }

      if (totalHops === 0) {
        // Node is on the edge — skip rolling, go straight to fall
        doFall()
      } else {
        // Animate multi-segment roll across board, then fall
        animateSegments(node.id, segments, nodeMap, HOP_DURATION,
          (globalHop, t, segStep, dir) => {
            const ho = hopOffsets[globalHop]
            setNodeAnim(node.id, {
              state: 'rolling',
              data: {
                totalHops,
                currentHop: 0,
                hopProgress: t,
                stepX: ho.stepX,
                stepY: ho.stepY,
                baseOffsetX: ho.x,
                baseOffsetY: ho.y,
                currentDir: dir,
              },
            })
          },
          doFall
        )
      }
    } else if (result.result === 'blocked') {
      const forwardHops = totalHops // spaces before the blocker

      if (forwardHops === 0) {
        // Immediately adjacent — just flash and stay
        animateValue(HIT_FLASH_DUR, (t) => {
          const flashT = t < 0.5 ? t * 2 : (1 - t) * 2
          setNodeAnim(node.id, {
            state: 'hit',
            data: { hitAtHops: 0, flashT, stepX: stepPixel.x, stepY: stepPixel.y },
          })
        }, () => {
          clearNodeAnim(node.id)
        })
        return
      }

      // Phase 1: roll forward through segments to the space just before the blocker
      animateSegments(node.id, segments, nodeMap, HOP_DURATION,
        (globalHop, t, segStep, dir) => {
          const ho = hopOffsets[globalHop]
          setNodeAnim(node.id, {
            state: 'rolling',
            data: {
              totalHops: forwardHops,
              currentHop: 0,
              hopProgress: t,
              stepX: ho.stepX,
              stepY: ho.stepY,
              baseOffsetX: ho.x,
              baseOffsetY: ho.y,
              currentDir: dir,
            },
          })
        },
        () => {
          // Phase 2: flash white at the collision point
          animateValue(HIT_FLASH_DUR, (t) => {
            const flashT = t < 0.5 ? t * 2 : (1 - t) * 2
            setNodeAnim(node.id, {
              state: 'hit',
              data: {
                hitAtHops: 0,
                flashT,
                stepX: 0,
                stepY: 0,
                baseOffsetX: cumulativeX,
                baseOffsetY: cumulativeY,
              },
            })
          }, () => {
            // Phase 3: roll back to start (reverse through hop offsets)
            const reversedHops = [...hopOffsets].reverse()
            let returnHop = 0
            const doReturnHop = () => {
              if (returnHop >= reversedHops.length) {
                clearNodeAnim(node.id)
                return
              }
              const rh = reversedHops[returnHop]
              const backStepX = -rh.stepX
              const backStepY = -rh.stepY
              const currentReturn = returnHop
              animateValue(RETURN_HOP_DUR, (t) => {
                // Base offset is the END of this hop (where we start returning from)
                const baseX = rh.x + rh.stepX
                const baseY = rh.y + rh.stepY
                setNodeAnim(node.id, {
                  state: 'returning',
                  data: {
                    totalHops: reversedHops.length,
                    currentHop: 0,
                    hopProgress: t,
                    stepX: backStepX,
                    stepY: backStepY,
                    baseOffsetX: baseX,
                    baseOffsetY: baseY,
                    currentDir: rh.dir,
                  },
                })
              }, () => {
                returnHop++
                doReturnHop()
              })
            }
            doReturnHop()
          })
        }
      )
    }
  }, [activeIds, nodeMap, changerMap, animateHops, animateSegments, setNodeAnim, clearNodeAnim])

  return {
    nodes,
    nodeMap,
    changerMap,
    activeIds,
    animStates,
    isWon: activeIds.size === 0 && animCount === 0,
    piecesRemaining: activeIds.size,
    handleHexClick,
    newGame,
    retry,
  }
}


/* ── Compute pixel offset for one hop in a given direction ─────── */
function computeStepPixelForDir(dir, nodeMap, hexSize = 30) {
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

  const AXIAL = {
    N:  { dq:  0, dr: -1 },
    NE: { dq:  1, dr: -1 },
    SE: { dq:  1, dr:  0 },
    S:  { dq:  0, dr:  1 },
    SW: { dq: -1, dr:  1 },
    NW: { dq: -1, dr:  0 },
  }
  const off = AXIAL[dir] || { dq: 0, dr: 0 }
  const from = hexToPixel(0, 0)
  const to = hexToPixel(off.dq, off.dr)
  return { x: to.x - from.x, y: to.y - from.y }
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
