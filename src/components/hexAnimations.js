import { HexDirection } from '../utils/hexUtils'

/** Unit-vector offsets per direction for slide animations. */
const SLIDE_OFFSET = {
  [HexDirection.North]:     { dx:  0,     dy: -1   },
  [HexDirection.NorthEast]: { dx:  0.866, dy: -0.5 },
  [HexDirection.SouthEast]: { dx:  0.866, dy:  0.5 },
  [HexDirection.South]:     { dx:  0,     dy:  1   },
  [HexDirection.SouthWest]: { dx: -0.866, dy:  0.5 },
  [HexDirection.NorthWest]: { dx: -0.866, dy: -0.5 },
}

/**
 * Compute visual properties driven by animation state.
 *
 * @param {object} params
 * @param {string} [params.animState]    – 'sliding' | 'blocked' | 'disappearing' | 'gone'
 * @param {number} [params.animProgress] – 0..1
 * @param {string} [params.direction]    – HexDirection value
 * @param {number} params.size           – hex radius in px
 * @param {string} [params.color]        – hex tile fill colour
 * @returns {{ translateX: number, translateY: number, scale: number, opacity: number, fillColor: string }}
 */
export function computeAnimValues({ animState, animProgress = 0, direction, size, color }) {
  let translateX = 0
  let translateY = 0
  let scale = 1
  let fillColor = color || 'var(--colour-hex-fill, #1a1a2e)'
  let opacity = 1

  const offset = SLIDE_OFFSET[direction] || { dx: 0, dy: 0 }

  if (animState === 'sliding') {
    const slideDistance = size * 6
    translateX = offset.dx * slideDistance * animProgress
    translateY = offset.dy * slideDistance * animProgress
    scale = 1 - animProgress * 0.6
    opacity = 1 - animProgress
  } else if (animState === 'blocked') {
    const bounceDistance = size * 1.5
    const t = animProgress < 0.5
      ? animProgress * 2
      : (1 - animProgress) * 2
    translateX = offset.dx * bounceDistance * t
    translateY = offset.dy * bounceDistance * t
    fillColor = `rgba(255, 60, 60, ${0.8 * (1 - animProgress)})`
  } else if (animState === 'disappearing') {
    scale = 1 - animProgress
    opacity = 1 - animProgress
  }

  return { translateX, translateY, scale, opacity, fillColor }
}
