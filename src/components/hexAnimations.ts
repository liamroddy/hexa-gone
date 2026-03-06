import type { Direction, RollValues, RollInput } from '../types'
import { HexDirection } from '../utils/hexDirections'

const DIR_ANGLE: Record<Direction, number> = {
  [HexDirection.North]:     -90,
  [HexDirection.NorthEast]: -30,
  [HexDirection.SouthEast]:  30,
  [HexDirection.South]:      90,
  [HexDirection.SouthWest]:  150,
  [HexDirection.NorthWest]:  210,
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function rollProfile(t: number): { hopT: number; tiltY: number; showBottom: boolean } {
  const cosA = Math.cos(t * Math.PI)
  return {
    hopT: easeInOutCubic(t),
    tiltY: cosA,
    showBottom: cosA < 0,
  }
}

export function computeRollValues({ animState, animData = {}, direction, size: _size, color }: RollInput): RollValues {
  const activeDir = animData.currentDir ?? direction
  const dirAngle = (activeDir ? DIR_ANGLE[activeDir] : undefined) ?? (direction ? DIR_ANGLE[direction] : undefined) ?? 0

  let translateX = 0
  let translateY = 0
  let scaleX = 1
  let scaleY = 1
  let opacity = 1
  let fillColor = color ?? 'var(--colour-hex-fill, #1a1a2e)'
  let showBottom = false

  const {
    currentHop: _currentHop = 0,
    hopProgress = 0,
    stepX = 0,
    stepY = 0,
    baseOffsetX = 0,
    baseOffsetY = 0,
  } = animData

  if (animState === 'rolling' || animState === 'falling' || animState === 'returning') {
    const { hopT, tiltY, showBottom: sb } = rollProfile(hopProgress)

    const completedHops = (_currentHop) + hopT
    translateX = baseOffsetX + stepX * completedHops
    translateY = baseOffsetY + stepY * completedHops

    scaleY = Math.abs(tiltY) * 0.6 + 0.4
    showBottom = sb

    if (animState === 'falling') {
      const fadeT = Math.max(0, hopProgress)
      opacity = 1 - easeOutQuad(fadeT)
      const shrink = 1 - fadeT * 0.5
      scaleX *= shrink
      scaleY *= shrink
    }
  } else if (animState === 'hit') {
    translateX = baseOffsetX + stepX * (animData.hitAtHops ?? 0)
    translateY = baseOffsetY + stepY * (animData.hitAtHops ?? 0)

    const flash = animData.flashT ?? 0
    if (flash > 0) {
      const intensity = Math.round(255 * flash)
      fillColor = `rgb(${intensity},${intensity},${intensity})`
    }
  }

  return { translateX, translateY, scaleX, scaleY, opacity, fillColor, showBottom, rotateZ: 0, dirAngle }
}
