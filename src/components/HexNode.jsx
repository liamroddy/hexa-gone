import { ARROW_ROTATION, extrudedHex, arrowPath } from './hexGeometry'
import { computeAnimValues } from './hexAnimations'
import { facePalette } from './hexPalette'

export default function HexNode({ node, x, y, size = 40, onClick, animState, animProgress = 0 }) {
  if (animState === 'gone') return null

  const { translateX, translateY, scale, opacity, fillColor } = computeAnimValues({
    animState,
    animProgress,
    direction: node.arrowDirection,
    size,
    color: node.color,
  })

  const { top, bottom, left, right, depth } = extrudedHex(size)
  const palette = facePalette(fillColor)
  const arrow = arrowPath(size)
  const rotation = ARROW_ROTATION[node.arrowDirection] ?? 0
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
      {/* Side faces drawn first (behind the top face) */}
      <polygon points={left}   fill={palette.left}   stroke={palette.left}   strokeWidth="0.5" />
      <polygon points={right}  fill={palette.right}  stroke={palette.right}  strokeWidth="0.5" />
      <polygon points={bottom} fill={palette.bottom} stroke={palette.bottom} strokeWidth="0.5" />

      {/* Top face (elevated) */}
      <polygon
        points={top}
        fill={palette.top}
        stroke="var(--colour-highlight, #00e0ff)"
        strokeWidth="2"
      />

      {/* Arrow sits on the elevated top face */}
      {node.arrowDirection && (
        <g transform={`translate(0,${-depth}) rotate(${rotation})`}>
          <path
            d={arrow}
            fill="var(--colour-highlight, #00e0ff)"
            opacity="0.85"
          />
        </g>
      )}
    </g>
  )
}
