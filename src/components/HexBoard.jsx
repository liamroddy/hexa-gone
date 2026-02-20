import HexNode from './HexNode'
import { hexPoints } from './hexGeometry'

export default function HexBoard({ nodes, hexSize = 30, onHexClick, animStates = new Map(), activeIds }) {
  const gapX = 12
  // Vertical gap scaled by sqrt(3)/2 so top/bottom gaps visually match side gaps
  const gapY = gapX * (Math.sqrt(3) / 2)

  const w = hexSize * 2 + gapX
  const h = hexSize * Math.sqrt(3) + gapY

  function hexToPixel(q, r) {
    const x = w * (3 / 4) * q
    const y = h * (r + q / 2)
    return { x, y }
  }

  const bgSize = w / 2

  const positioned = nodes.map(node => {
    const { x, y } = hexToPixel(node.q, node.r)
    return { node, x, y }
  })

  const xs = positioned.map(p => p.x)
  const ys = positioned.map(p => p.y)
  const pad = hexSize + 10
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const maxX = Math.max(...xs) + pad
  const maxY = Math.max(...ys) + pad

  const bgPoints = hexPoints(bgSize)

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      style={{ width: '100%', maxWidth: 600, height: 'auto' }}
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
            animProgress={anim?.progress}
          />
        )
      })}
    </svg>
  )
}
