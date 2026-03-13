import type { HexNodeData, AnimStateName, AnimData } from '../types'
import { ARROW_ROTATION, extrudedHex, arrowPath } from './hexGeometry'
import { computeRollValues } from './hexAnimations'
import { facePalette } from './hexPalette'

interface HexNodeProps {
  node: HexNodeData
  x: number
  y: number
  size?: number
  onClick?: (node: HexNodeData) => void
  animState?: AnimStateName
  animData?: AnimData
}

export default function HexNode({ node, x, y, size = 40, onClick, animState, animData }: HexNodeProps) {
  if (animState === 'gone') return null
  // Bomb nodes in 'waiting' state are kept visible by the bomb icon in HexBoard, not by HexNode
  if (animState === 'waiting' && !node.arrowDirection) return null

  const {
    translateX, translateY,
    scaleX, scaleY,
    opacity, fillColor,
    dirAngle,
  } = computeRollValues({ animState, animData: animData ?? {}, direction: node.arrowDirection, size, color: node.color })

  const { top, bottom, left, right, depth } = extrudedHex(size)
  const palette = facePalette(fillColor)
  const arrow = arrowPath(size)
  const activeDir = animData?.currentDir ?? node.arrowDirection
  const rotation = activeDir ? (ARROW_ROTATION[activeDir] ?? 0) : 0
  const tiltAngle = dirAngle || 0

  // Explosion burst effect
  if (animState === 'exploding') {
    const t = animData?.explodeT ?? 0
    const burstRadius = size * (0.5 + t * 2)
    return (
      <g
        className="hex-node"
        transform={`translate(${x + translateX},${y + translateY})`}
        style={{ opacity }}
      >
        <g transform={`scale(${scaleX},${scaleY})`}>
          <polygon points={top} fill={palette.top} stroke="var(--colour-highlight, #00e0ff)" strokeWidth="2" />
          <polygon points={left} fill={palette.left} stroke={palette.left} strokeWidth="0.5" />
          <polygon points={right} fill={palette.right} stroke={palette.right} strokeWidth="0.5" />
          <polygon points={bottom} fill={palette.bottom} stroke={palette.bottom} strokeWidth="0.5" />
        </g>
        {/* Explosion burst rings */}
        <circle cx={0} cy={0} r={burstRadius * 0.6} fill="none" stroke="#ff6600" strokeWidth={3 * (1 - t)} opacity={1 - t} />
        <circle cx={0} cy={0} r={burstRadius} fill="none" stroke="#ffcc00" strokeWidth={2 * (1 - t)} opacity={0.7 * (1 - t)} />
        {/* Explosion particles */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          const dist = burstRadius * 0.8
          return (
            <circle
              key={i}
              cx={Math.cos(rad) * dist}
              cy={Math.sin(rad) * dist}
              r={size * 0.08 * (1 - t)}
              fill="#ff4400"
              opacity={1 - t}
            />
          )
        })}
      </g>
    )
  }

  return (
    <g
      className="hex-node"
      transform={`translate(${x + translateX},${y + translateY})`}
      onClick={() => onClick?.(node)}
      style={{
        cursor: onClick && !animState ? 'pointer' : 'default',
        opacity,
        transition: animState ? 'none' : 'opacity 0.2s',
      }}
    >
      <g transform={`rotate(${tiltAngle}) scale(${scaleX},${scaleY}) rotate(${-tiltAngle})`}>
        <polygon points={left}   fill={palette.left}   stroke={palette.left}   strokeWidth="0.5" />
        <polygon points={right}  fill={palette.right}  stroke={palette.right}  strokeWidth="0.5" />
        <polygon points={bottom} fill={palette.bottom} stroke={palette.bottom} strokeWidth="0.5" />
        <polygon points={top}    fill={palette.top}     stroke="var(--colour-highlight, #00e0ff)" strokeWidth="2" />

        {node.arrowDirection && (
          <g transform={`translate(0,${-depth}) rotate(${rotation})`}>
            <path d={arrow} fill="var(--colour-highlight, #00e0ff)" opacity="0.85" />
          </g>
        )}
      </g>
    </g>
  )
}
