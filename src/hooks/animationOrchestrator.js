import { animateValue } from '../utils/animate'

const HOP_DURATION   = 220
const FALL_DURATION  = 350
const HIT_FLASH_DUR  = 180
const RETURN_HOP_DUR = 180

function buildHopOffsets(segments, stepPixelForDir) {
  const offsets = []
  let cumulativeX = 0
  let cumulativeY = 0

  for (const seg of segments) {
    const step = stepPixelForDir(seg.dir)
    for (let i = 0; i < seg.count; i++) {
      offsets.push({ x: cumulativeX, y: cumulativeY, stepX: step.x, stepY: step.y, dir: seg.dir })
      cumulativeX += step.x
      cumulativeY += step.y
    }
  }

  return { offsets, endX: cumulativeX, endY: cumulativeY }
}

function animateSegmentHops(segments, stepPixelForDir, perHopDur, onHopFrame, onDone) {
  let segIdx = 0
  let globalHop = 0

  const nextSegment = () => {
    if (segIdx >= segments.length) { onDone(); return }
    const seg = segments[segIdx]
    const step = stepPixelForDir(seg.dir)
    let hop = 0

    const nextHop = () => {
      if (hop >= seg.count) { segIdx++; nextSegment(); return }
      const currentGlobal = globalHop
      animateValue(perHopDur, (t) => onHopFrame(currentGlobal, t), () => {
        hop++
        globalHop++
        nextHop()
      })
    }
    nextHop()
  }
  nextSegment()
}

function flashAnimation(duration, onFrame, onDone) {
  animateValue(duration, (t) => {
    const flashT = t < 0.5 ? t * 2 : (1 - t) * 2
    onFrame(flashT)
  }, onDone)
}

function reverseHopAnimation(hopOffsets, onFrame, onDone) {
  const reversed = [...hopOffsets].reverse()
  let idx = 0

  const nextHop = () => {
    if (idx >= reversed.length) { onDone(); return }
    const hop = reversed[idx]
    animateValue(RETURN_HOP_DUR, (t) => {
      onFrame({
        hopProgress: t,
        stepX: -hop.stepX,
        stepY: -hop.stepY,
        baseOffsetX: hop.x + hop.stepX,
        baseOffsetY: hop.y + hop.stepY,
        dir: hop.dir,
      })
    }, () => {
      idx++
      nextHop()
    })
  }
  nextHop()
}

export function orchestrateEscape(nodeId, segments, stepPixelForDir, setNodeAnim, onComplete) {
  const { offsets, endX, endY } = buildHopOffsets(segments, stepPixelForDir)
  const totalHops = offsets.length
  const lastDir = segments.length > 0 ? segments[segments.length - 1].dir : null

  const doFall = () => {
    const fallStep = lastDir ? stepPixelForDir(lastDir) : { x: 0, y: 0 }
    animateValue(FALL_DURATION, (t) => {
      setNodeAnim(nodeId, {
        state: 'falling',
        data: {
          hopProgress: t,
          stepX: fallStep.x,
          stepY: fallStep.y,
          baseOffsetX: endX,
          baseOffsetY: endY,
          currentDir: lastDir,
        },
      })
    }, () => {
      setNodeAnim(nodeId, { state: 'gone', data: {} })
      onComplete()
    })
  }

  if (totalHops === 0) {
    doFall()
    return
  }

  animateSegmentHops(segments, stepPixelForDir, HOP_DURATION,
    (globalHop, t) => {
      const hop = offsets[globalHop]
      setNodeAnim(nodeId, {
        state: 'rolling',
        data: {
          hopProgress: t,
          stepX: hop.stepX,
          stepY: hop.stepY,
          baseOffsetX: hop.x,
          baseOffsetY: hop.y,
          currentDir: hop.dir,
        },
      })
    },
    doFall,
  )
}

export function orchestrateBlocked(nodeId, segments, stepPixelForDir, setNodeAnim, onComplete) {
  const { offsets, endX, endY } = buildHopOffsets(segments, stepPixelForDir)
  const totalHops = offsets.length

  if (totalHops === 0) {
    const step = segments.length > 0 ? stepPixelForDir(segments[0].dir) : { x: 0, y: 0 }
    flashAnimation(HIT_FLASH_DUR, (flashT) => {
      setNodeAnim(nodeId, {
        state: 'hit',
        data: { hitAtHops: 0, flashT, stepX: step.x, stepY: step.y },
      })
    }, () => {
      setNodeAnim(nodeId, null)
      onComplete()
    })
    return
  }

  // Phase 1: roll forward
  animateSegmentHops(segments, stepPixelForDir, HOP_DURATION,
    (globalHop, t) => {
      const hop = offsets[globalHop]
      setNodeAnim(nodeId, {
        state: 'rolling',
        data: {
          hopProgress: t,
          stepX: hop.stepX,
          stepY: hop.stepY,
          baseOffsetX: hop.x,
          baseOffsetY: hop.y,
          currentDir: hop.dir,
        },
      })
    },
    () => {
      // Phase 2: collision flash
      flashAnimation(HIT_FLASH_DUR, (flashT) => {
        setNodeAnim(nodeId, {
          state: 'hit',
          data: { hitAtHops: 0, flashT, stepX: 0, stepY: 0, baseOffsetX: endX, baseOffsetY: endY },
        })
      }, () => {
        // Phase 3: roll back
        reverseHopAnimation(offsets, (frame) => {
          setNodeAnim(nodeId, {
            state: 'returning',
            data: {
              hopProgress: frame.hopProgress,
              stepX: frame.stepX,
              stepY: frame.stepY,
              baseOffsetX: frame.baseOffsetX,
              baseOffsetY: frame.baseOffsetY,
              currentDir: frame.dir,
            },
          })
        }, () => {
          setNodeAnim(nodeId, null)
          onComplete()
        })
      })
    },
  )
}
