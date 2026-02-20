import HexBoard from '../components/HexBoard'
import { useGameState } from '../hooks/useGameState'

export default function GameScreen({ onBack }) {
  const {
    nodes, activeIds, animStates, isWon, piecesRemaining,
    handleHexClick, newGame, retry,
  } = useGameState(2)

  return (
    <div className="screen game-screen">
      <HexBoard
        nodes={nodes}
        hexSize={30}
        onHexClick={handleHexClick}
        animStates={animStates}
        activeIds={activeIds}
      />
      <p className="pieces-left">{piecesRemaining} pieces remaining</p>
      <div className="bottom-buttons">
        <button className="btn btn-retry" onClick={retry}>Retry</button>
        <button className="btn btn-main-menu" onClick={onBack}>Main Menu</button>
      </div>

      {isWon && (
        <div className="modal-overlay" onClick={newGame}>
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
