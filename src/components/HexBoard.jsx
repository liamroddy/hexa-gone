import HexNode from './HexNode'

/**
 * Renders the full hex grid as an SVG.
 *
 * Props:
 *  - nodes: array of hex node objects (with q, r coords)
 *  - hexSize: radius of each hex in px
 *  - onHexClick: optional (node) => void
 *  - animStates: Map of nodeId -> { state, progress }
 *  - activeIds: Set of node IDs still on the board
 */
export default function HexBoard({ nodes, hexSize = 30, onHexClick, animStates = new Map(), activeIds }) {
  const gap = 12

  // Flat-top hex: width = 2*size, height = sqrt(3)*size
  const w = hexSize * 2 + gap
  const h = hexSize * Math.sqrt(3) + gap

  function hexToPixel(q, r) {
    const x = w * (3 / 4) * q
    const y = h * (r + q / 2)
    return { x, y }
  }

  // Compute positions and find bounding box
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

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      style={{ width: '100%', maxWidth: 600, height: 'auto' }}
      role="img"
      aria-label="Hexagon game board"
    >
      {positioned.map(({ node, x, y }) => {
        const anim = animStates.get(node.id)
        // Skip nodes that have been removed and aren't animating
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
