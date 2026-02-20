import { ARROW_ROTATION, hexPoints, arrowPath } from './hexGeometry'
import { computeAnimValues } from './hexAnimations'

export default function HexNode({ node, x, y, size = 40, onClick, animState, animProgress = 0 }) {
  if (animState === 'gone') return null

  const { translateX, translateY, scale, opacity, fillColor } = computeAnimValues({
    animState,
    animProgress,
    direction: node.arrowDirection,
    size,
    color: node.color,
  })

  const points = hexPoints(size)
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
      <polygon
        points={points}
        fill={fillColor}
        stroke="var(--colour-highlight, #00e0ff)"
        strokeWidth="2"
      />
      {node.arrowDirection && (
        <g transform={`rotate(${rotation})`}>
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
