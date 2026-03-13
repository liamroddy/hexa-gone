import type { HexNodeData, AnimEntry, ChangerMap, BombMap } from '../types'
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
  bombMap?: BombMap
}

export default function HexBoard({
  nodes,
  hexSize = 30,
  onHexClick,
  animStates = new Map(),
  activeIds,
  changerMap = {},
  bombMap = new Set(),
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

      <g aria-hidden="true">
        {positioned.map(({ node, x, y }) => {
          if (!bombMap.has(node.id)) {
            // Also show bomb if it has a waiting/exploding animation (deferred detonation)
            const anim = animStates.get(node.id)
            if (!anim || (anim.state !== 'waiting' && anim.state !== 'exploding')) return null
          }
          const bs = hexSize * 0.55
          const anim = animStates.get(node.id)
          // Hide the bomb icon once explosion starts (the HexNode explosion effect takes over)
          if (anim?.state === 'exploding' || anim?.state === 'gone') return null
          return (
            <g key={`bomb-${node.id}`} transform={`translate(${x},${y})`}>
              <circle cx={0} cy={bs * 0.1} r={bs * 0.55} fill="#1a1a2e" stroke="#555" strokeWidth="1.5" />
              <rect x={-bs * 0.08} y={-bs * 0.45} width={bs * 0.16} height={bs * 0.15} rx={bs * 0.04} fill="#888" />
              <path
                d={`M 0,${-bs * 0.45} Q ${bs * 0.2},${-bs * 0.7} ${bs * 0.05},${-bs * 0.85}`}
                fill="none" stroke="#c8a050" strokeWidth="1.5" strokeLinecap="round"
              />
              <circle cx={bs * 0.05} cy={-bs * 0.88} r={bs * 0.1} fill="#ff6600" opacity="0.9" />
              <circle cx={bs * 0.05} cy={-bs * 0.88} r={bs * 0.06} fill="#ffcc00" />
              <circle cx={-bs * 0.15} cy={-bs * 0.08} r={bs * 0.12} fill="white" opacity="0.25" />
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
