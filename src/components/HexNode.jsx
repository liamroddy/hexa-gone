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
  } = computeRollValues({
    animState,
    animData,
    direction: node.arrowDirection,
    size,
    color: node.color,
  })

  const { top, bottom, left, right, depth } = extrudedHex(size)
  const palette = facePalette(fillColor)
  const arrow = arrowPath(size)
  const rotation = ARROW_ROTATION[node.arrowDirection] ?? 0

  // Build the transform: translate to board position + anim offset,
  // then apply the rolling tilt (rotate into travel dir, squash Y, rotate back)
  const tx = x + translateX
  const ty = y + translateY

  // The tilt is applied as a scaleY squeeze oriented along the travel direction.
  // We rotate so the travel direction points "up", apply scaleY, then rotate back.
  const tiltAngle = dirAngle || 0

  return (
    <g
      className="hex-node"
      transform={`translate(${tx},${ty})`}
      onClick={() => onClick?.(node)}
      style={{
        cursor: onClick && !animState ? 'pointer' : 'default',
        opacity,
        transition: animState ? 'none' : 'opacity 0.2s',
      }}
    >
      <g transform={`rotate(${tiltAngle}) scale(${scaleX},${scaleY}) rotate(${-tiltAngle})`}>
        {showBottom ? (
          /* Bottom face visible: show the 3 side rectangles facing up + bottom face with arrow */
          <>
            {/* Side faces become the prominent visible faces during roll */}
            <polygon points={left}   fill={palette.left}   stroke={palette.left}   strokeWidth="0.5" />
            <polygon points={right}  fill={palette.right}  stroke={palette.right}  strokeWidth="0.5" />
            <polygon points={bottom} fill={palette.bottom} stroke={palette.bottom} strokeWidth="0.5" />

            {/* "Bottom" face = mirror of top face, drawn at the top-face position */}
            <polygon
              points={top}
              fill={palette.top}
              stroke="var(--colour-highlight, #00e0ff)"
              strokeWidth="2"
            />

            {/* Arrow on bottom face (mirrored vertically to show it's the underside) */}
            {node.arrowDirection && (
              <g transform={`translate(0,${-depth}) rotate(${rotation}) scale(1,-1)`}>
                <path
                  d={arrow}
                  fill="var(--colour-highlight, #00e0ff)"
                  opacity="0.85"
                />
              </g>
            )}
          </>
        ) : (
          /* Normal top-face view */
          <>
            <polygon points={left}   fill={palette.left}   stroke={palette.left}   strokeWidth="0.5" />
            <polygon points={right}  fill={palette.right}  stroke={palette.right}  strokeWidth="0.5" />
            <polygon points={bottom} fill={palette.bottom} stroke={palette.bottom} strokeWidth="0.5" />

            <polygon
              points={top}
              fill={palette.top}
              stroke="var(--colour-highlight, #00e0ff)"
              strokeWidth="2"
            />

            {node.arrowDirection && (
              <g transform={`translate(0,${-depth}) rotate(${rotation})`}>
                <path
                  d={arrow}
                  fill="var(--colour-highlight, #00e0ff)"
                  opacity="0.85"
                />
              </g>
            )}
          </>
        )}
      </g>
    </g>
  )
}
