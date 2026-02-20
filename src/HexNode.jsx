import { HexDirection } from './hexUtils'

/** Rotation angles for the arrow indicator per direction. */
const ARROW_ROTATION = {
  [HexDirection.North]:     0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]:     180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
}

/**
 * Renders a single hexagon tile.
 *
 * Props:
 *  - node: { id, arrowDirection, neighbors, q, r }
 *  - x, y: pixel position (center of hex)
 *  - size: hex radius in px
 *  - onClick: optional click handler
 */
export default function HexNode({ node, x, y, size = 40, onClick }) {
  const rotation = ARROW_ROTATION[node.arrowDirection] ?? 0

  // Flat-top hex points
  const points = Array.from({ length: 6 }, (_, i) => {
    const angleDeg = 60 * i
    const angleRad = (Math.PI / 180) * angleDeg
    return `${x + size * Math.cos(angleRad)},${y + size * Math.sin(angleRad)}`
  }).join(' ')

  // Small arrow triangle pointing "up" (North), then rotated
  const arrowSize = size * 0.3
  const arrow = [
    `0,${-arrowSize}`,
    `${-arrowSize * 0.5},${arrowSize * 0.4}`,
    `${arrowSize * 0.5},${arrowSize * 0.4}`,
  ].join(' ')

  return (
    <g
      className="hex-node"
      onClick={() => onClick?.(node)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <polygon
        points={points}
        fill="var(--colour-hex-fill, #1a1a2e)"
        stroke="var(--colour-highlight, #00e0ff)"
        strokeWidth="2"
      />
      <g transform={`translate(${x},${y}) rotate(${rotation})`}>
        <polygon
          points={arrow}
          fill="var(--colour-highlight, #00e0ff)"
          opacity="0.85"
        />
      </g>
    </g>
  )
}
