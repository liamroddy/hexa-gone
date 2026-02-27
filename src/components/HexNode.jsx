import { ARROW_ROTATION, extrudedHex, arrowPath } from './hexGeometry'
import { computeRollValues } from './hexAnimations'
import { facePalette } from './hexPalette'

export default function HexNode({ node, x, y, size = 40, onClick, animState, animData }) {
  if (animState === 'gone') return null

  const {
    translateX, translateY,
    scaleX, scaleY,
    opacity, fillColor,
    showBottom, dirAngle,
  } = computeRollValues({ animState, animData, direction: node.arrowDirection, size, color: node.color })

  const { top, bottom, left, right, depth } = extrudedHex(size)
  const palette = facePalette(fillColor)
  const arrow = arrowPath(size)
  const activeDir = animData?.currentDir || node.arrowDirection
  const rotation = ARROW_ROTATION[activeDir] ?? 0
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
