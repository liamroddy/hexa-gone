import { HexDirection } from '../utils/hexUtils'

/** Rotation angles for the arrow indicator per direction. */
const ARROW_ROTATION = {
  [HexDirection.North]:     0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]:     180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
}

/** Pixel offset direction for sliding animation. */
const SLIDE_OFFSET = {
  [HexDirection.North]:     { dx:  0,   dy: -1   },
  [HexDirection.NorthEast]: { dx:  0.866, dy: -0.5 },
  [HexDirection.SouthEast]: { dx:  0.866, dy:  0.5 },
  [HexDirection.South]:     { dx:  0,   dy:  1   },
  [HexDirection.SouthWest]: { dx: -0.866, dy:  0.5 },
  [HexDirection.NorthWest]: { dx: -0.866, dy: -0.5 },
}

/**
 * Renders a single hexagon tile with animation support.
 *
 * Props:
 *  - node: { id, arrowDirection, neighbors, q, r }
 *  - x, y: pixel position (center of hex)
 *  - size: hex radius in px
 *  - onClick: optional click handler
 *  - animState: undefined | 'sliding' | 'blocked' | 'disappearing' | 'gone'
 *  - animProgress: 0..1 for animation interpolation
 */
export default function HexNode({ node, x, y, size = 40, onClick, animState, animProgress = 0 }) {
  const rotation = ARROW_ROTATION[node.arrowDirection] ?? 0

  // Don't render removed nodes
  if (animState === 'gone') return null

  // Calculate transform based on animation state
  let translateX = 0
  let translateY = 0
  let scale = 1
  let fillColor = 'var(--colour-hex-fill, #1a1a2e)'
  let opacity = 1

  const slideDistance = size * 6 // how far to slide off-screen

  if (animState === 'sliding') {
    const offset = SLIDE_OFFSET[node.arrowDirection] || { dx: 0, dy: 0 }
    translateX = offset.dx * slideDistance * animProgress
    translateY = offset.dy * slideDistance * animProgress
    // Shrink as it slides away
    scale = 1 - animProgress * 0.6
    opacity = 1 - animProgress
  } else if (animState === 'blocked') {
    // Quick slide out then bounce back, flash red
    const offset = SLIDE_OFFSET[node.arrowDirection] || { dx: 0, dy: 0 }
    const bounceDistance = size * 1.5
    // First half: slide out. Second half: slide back.
    const t = animProgress < 0.5
      ? animProgress * 2        // 0→1 (going out)
      : (1 - animProgress) * 2  // 1→0 (coming back)
    translateX = offset.dx * bounceDistance * t
    translateY = offset.dy * bounceDistance * t
    fillColor = `rgba(255, 60, 60, ${0.8 * (1 - animProgress)})`
  } else if (animState === 'disappearing') {
    // Shrink and fade at the edge
    scale = 1 - animProgress
    opacity = 1 - animProgress
  }

  // Flat-top hex points (relative to 0,0 — we'll translate the whole group)
  const points = Array.from({ length: 6 }, (_, i) => {
    const angleDeg = 60 * i
    const angleRad = (Math.PI / 180) * angleDeg
    return `${size * Math.cos(angleRad)},${size * Math.sin(angleRad)}`
  }).join(' ')

  // Arrow dimensions (pointing North before rotation)
  const hw = size * 0.05
  const hh = size * 0.18
  const tip  = -size * 0.42
  const base = -size * 0.42 + size * 0.28
  const tail =  size * 0.42

  const arrowPath = [
    `M 0,${tip}`,
    `L ${hh},${base}`,
    `L ${hw},${base}`,
    `L ${hw},${tail}`,
    `L ${-hw},${tail}`,
    `L ${-hw},${base}`,
    `L ${-hh},${base}`,
    `Z`,
  ].join(' ')

  const groupTransform = `translate(${x + translateX},${y + translateY}) scale(${scale})`

  return (
    <g
      className="hex-node"
      transform={groupTransform}
      onClick={() => onClick?.(node)}
      style={{
        cursor: onClick && !animState ? 'pointer' : 'default',
        opacity,
        transition: animState ? 'none' : 'opacity 0.2s',
      }}
    >
      <polygon
        points={points}
        fill={fillColor}
        stroke="var(--colour-highlight, #00e0ff)"
        strokeWidth="2"
      />
      {node.arrowDirection && (
        <g transform={`rotate(${rotation})`}>
          <path
            d={arrowPath}
            fill="var(--colour-highlight, #00e0ff)"
            opacity="0.85"
          />
        </g>
      )}
    </g>
  )
}
