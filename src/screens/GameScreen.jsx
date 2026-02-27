import HexBoard from '../components/HexBoard'
import { useGameState } from '../hooks/useGameState'

/** Shrink hexes on bigger boards so they fit comfortably */
function hexSizeForRadius(radius) {
  if (radius <= 2) return 30
  if (radius === 3) return 22
  return 18
}

export default function GameScreen({ radius = 2, onBack }) {
  const hexSize = hexSizeForRadius(radius)

  const {
    nodes, activeIds, animStates, isWon, piecesRemaining,
    handleHexClick, newGame, retry, changerMap,
  } = useGameState(radius, hexSize)

  return (
    <div className="screen game-screen" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>
          <HexBoard
            nodes={nodes}
            hexSize={hexSize}
            onHexClick={handleHexClick}
            animStates={animStates}
            activeIds={activeIds}
            changerMap={changerMap}
          />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1 }} />
        <div style={{ pointerEvents: 'auto', textAlign: 'center', paddingBottom: '2rem' }}>
          <p className="pieces-left">{piecesRemaining} pieces remaining</p>
          <div className="bottom-buttons">
            <button className="btn btn-retry" onClick={retry}>Retry</button>
            <button className="btn btn-main-menu" onClick={onBack}>Main Menu</button>
          </div>
        </div>
      </div>

      {isWon && (
        <div className="modal-overlay" onClick={newGame} style={{ zIndex: 2 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <p className="win-message">Congrats, board cleared!</p>
            <div className="modal-buttons">
              <button className="btn btn-new-game" onClick={newGame}>New Game</button>
              <button className="btn btn-retry" onClick={retry}>Retry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
