import { HexDirection } from '../utils/hexDirections'

/* ── Direction unit vectors ──────────────────────────────────────── */
const DIR_VEC = {
  [HexDirection.North]:     { dx:  0,     dy: -1   },
  [HexDirection.NorthEast]: { dx:  0.866, dy: -0.5 },
  [HexDirection.SouthEast]: { dx:  0.866, dy:  0.5 },
  [HexDirection.South]:     { dx:  0,     dy:  1   },
  [HexDirection.SouthWest]: { dx: -0.866, dy:  0.5 },
  [HexDirection.NorthWest]: { dx: -0.866, dy: -0.5 },
}

/* ── Rolling rotation axis per direction ─────────────────────────
 * The hex rolls "forward" in its travel direction. The rotation axis
 * is perpendicular to the travel vector (in the SVG plane).
 * For SVG we fake 3D with a scaleY squeeze + vertical shift.
 * `rollAngle` is the signed angle the direction makes with the +X axis,
 * used to orient the perspective tilt.                                */
const DIR_ANGLE = {
  [HexDirection.North]:     -90,
  [HexDirection.NorthEast]: -30,
  [HexDirection.SouthEast]:  30,
  [HexDirection.South]:      90,
  [HexDirection.SouthWest]:  150,
  [HexDirection.NorthWest]:  210,
}

/* ── Easing helpers ──────────────────────────────────────────────── */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t)
}

/* ── Single-hop roll curve ───────────────────────────────────────
 * t goes 0→1 for one hop.
 * Returns { hopT, tiltY, showBottom }
 *   hopT      – eased 0→1 positional progress across the hop
 *   tiltY     – scaleY factor (1 = flat top, 0 = edge-on, -1 = bottom face)
 *   showBottom – true when we should render the bottom face (arrow mirrored)
 *
 * The roll profile:
 *   0.0–0.4  top face tilts forward  (scaleY 1 → 0)
 *   0.4–0.6  edge-on, then bottom face appears (scaleY 0 → -0.6 → 0)
 *   0.6–1.0  bottom face settles flat (scaleY 0 → 1)  — but it's the
 *            "bottom" face so we flip the arrow.
 *
 * Actually simpler: we do a continuous rotation mapped to scaleY.
 * Phase 0→0.5: top face rotating away (scaleY 1→-1)
 * Phase 0.5→1: bottom face rotating in (scaleY -1→1)
 * We show "bottom" when scaleY < 0.                                  */

function rollProfile(t) {
  // Map t to a rotation angle 0 → π (half turn)
  const angle = t * Math.PI
  const cosA = Math.cos(angle)

  // scaleY simulates the 3D tilt: 1 at start, 0 at edge-on, -1 at bottom
  const tiltY = cosA
  const showBottom = cosA < 0

  // Positional progress uses eased t
  const hopT = easeInOutCubic(t)

  return { hopT, tiltY, showBottom }
}

/* ── Main animation value computer ───────────────────────────────
 *
 * animState is one of:
 *   'rolling'     – normal roll (escape or blocked-forward phase)
 *   'falling'     – rolling off the edge, fading out
 *   'hit'         – flash white on collision
 *   'returning'   – rolling back to start after collision
 *   'gone'        – removed from board
 *
 * animProgress: 0→1 within the current phase
 *
 * Extra data in animData:
 *   totalHops     – how many hex spaces to roll
 *   currentHop    – which hop we're on (0-indexed)
 *   hopProgress   – 0→1 within the current hop
 *   stepPixelX/Y  – pixel distance of one hop in the travel direction
 *   returning     – true if rolling back after collision
 */
export function computeRollValues({
  animState,
  animData = {},
  direction,
  size,
  color,
}) {
  // Use currentDir from animData if available (direction changers redirect mid-slide)
  const activeDir = animData.currentDir || direction
  const dirAngle = DIR_ANGLE[activeDir] || DIR_ANGLE[direction] || 0

  let translateX = 0
  let translateY = 0
  let scaleX = 1
  let scaleY = 1
  let opacity = 1
  let fillColor = color || 'var(--colour-hex-fill, #1a1a2e)'
  let showBottom = false
  let rotateZ = 0 // extra rotation for the whole group

  const {
    totalHops = 1,
    currentHop = 0,
    hopProgress = 0,
    stepX = 0,
    stepY = 0,
  } = animData

  const baseOffsetX = animData.baseOffsetX || 0
  const baseOffsetY = animData.baseOffsetY || 0

  if (animState === 'rolling' || animState === 'falling' || animState === 'returning') {
    const { hopT, tiltY, showBottom: sb } = rollProfile(hopProgress)

    // How many full hops completed + fractional current hop
    const completedHops = currentHop + hopT
    translateX = baseOffsetX + stepX * completedHops
    translateY = baseOffsetY + stepY * completedHops

    // The tilt: we scale Y relative to the travel direction.
    // We rotate the group to align with travel, apply scaleY, then rotate back.
    // But for SVG simplicity, we use a perspective-like scaleY on the hex body.
    scaleY = Math.abs(tiltY) * 0.6 + 0.4 // never fully flat, range 0.4–1.0
    showBottom = sb

    if (animState === 'falling') {
      // After rolling off the last board hex, continue rolling while fading
      const fadeStart = 0.0
      const fadeT = Math.max(0, (hopProgress - fadeStart) / (1 - fadeStart))
      opacity = 1 - easeOutQuad(fadeT)
      const shrink = 1 - fadeT * 0.5
      scaleX *= shrink
      scaleY *= shrink
    }
  } else if (animState === 'hit') {
    // Stationary at the collision point, flash white
    const { hitAtHops = 0 } = animData
    translateX = (baseOffsetX || 0) + stepX * hitAtHops
    translateY = (baseOffsetY || 0) + stepY * hitAtHops
    // Flash: lerp to white and back
    const flash = animData.flashT || 0
    if (flash > 0) {
      const intensity = Math.round(255 * flash)
      fillColor = `rgb(${intensity},${intensity},${intensity})`
    }
  }

  return { translateX, translateY, scaleX, scaleY, opacity, fillColor, showBottom, rotateZ, dirAngle }
}
