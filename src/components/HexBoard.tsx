import type { HexNodeData, AnimEntry, ChangerMap } from '../types'
import HexNode from './HexNode'
import { hexPoints, changerChevronPath, ARROW_ROTATION } from './hexGeometry'
import { createLayout, DEPTH_FACTOR } from '../utils/hexLayout'

interface HexBoardProps {
  nodes: HexNodeData[]
  hexSize?: number
  onHexClick?: (node: HexNodeData) => void
  animStates?: Map<string, AnimEntry>
  activeIds?: Set<string>
  changerMap?: ChangerMap
}

export default function HexBoard({
  nodes,
  hexSize = 30,
  onHexClick,
  animStates = new Map(),
  activeIds,
  changerMap = {},
}: HexBoardProps) {
  const layout = createLayout(hexSize)

  const positioned = nodes.map(node => ({
    node,
    ...layout.hexToPixel(node.q, node.r),
  }))

  const xs = positioned.map(p => p.x)
  const ys = positioned.map(p => p.y)
  const depth = hexSize * DEPTH_FACTOR
  const pad = hexSize + 10
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad - depth
  const maxX = Math.max(...xs) + pad
  const maxY = Math.max(...ys) + pad

  const bgPoints = hexPoints(layout.cellWidth / 2)
  const changerSize = hexSize * 0.85
  const changerPoints = hexPoints(changerSize)
  const chevron = changerChevronPath(changerSize)

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      role="img"
      aria-label="Hexagon game board"
    >
      <g aria-hidden="true">
        {positioned.map(({ node, x, y }) => (
          <polygon
            key={`bg-${node.id}`}
            points={bgPoints}
            transform={`translate(${x},${y})`}
            fill="var(--colour-highlight, #00e0ff)"
            fillOpacity="0.04"
            stroke="var(--colour-highlight, #00e0ff)"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        ))}
      </g>

      <g aria-hidden="true">
        {positioned.map(({ node, x, y }) => {
          const changerDir = changerMap[node.id]
          if (!changerDir) return null
          const rot = ARROW_ROTATION[changerDir] ?? 0
          return (
            <g key={`changer-${node.id}`} transform={`translate(${x},${y})`}>
              <polygon points={changerPoints} fill="#3a3a4a" stroke="#555" strokeWidth="1" />
              <g transform={`rotate(${rot})`}>
                <path
                  d={chevron}
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.85"
                />
              </g>
            </g>
          )
        })}
      </g>

      {positioned.map(({ node, x, y }) => {
        const anim = animStates.get(node.id)
        if (activeIds && !activeIds.has(node.id) && !anim) return null
        return (
          <HexNode
            key={node.id}
            node={node}
            x={x}
            y={y}
            size={hexSize}
            onClick={onHexClick}
            animState={anim?.state}
            animData={anim?.data}
          />
        )
      })}
    </svg>
  )
}
