import { useMemo } from 'react'
import HexBoard from './HexBoard'
import { buildHexGrid } from './hexUtils'

export default function GameScreen({ onBack }) {
  const { nodes } = useMemo(() => buildHexGrid(2), [])

  return (
    <div className="screen game-screen">
      <HexBoard nodes={nodes} hexSize={40} />
      <button className="btn btn-back" onClick={onBack}>Back</button>
    </div>
  )
}
