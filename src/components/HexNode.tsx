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
