import type { Direction, NodeMap, ChangerMap, BombMap, Board } from "../types";
import { ALL_DIRECTIONS, AXIAL_OFFSETS, oppositeDir } from "./hexDirections";
import { buildGridStructure } from "./hexGraph";
import { pickRandom } from "./helpers";
import { DIRECTION_COLOUR } from "../theme";

export function changerCountForRadius(radius: number): number {
  if (radius <= 2) {
    return 3;
  }
  const totalHexes = 3 * radius * radius + 3 * radius + 1;
  return Math.max(3, Math.round(totalHexes / 6));
}

export function bombCountForRadius(radius: number): number {
  if (radius <= 2) {
    return 1;
  }
  if (radius === 3) {
    return 2;
  }
  return 3;
}

const MIN_HOPS_TO_CHANGER = 2;

interface SolveStep {
  id: string;
  dir: Direction;
  remainingSnapshot: Set<string>;
}

/**
 * Generates a guaranteed-solvable board using a "peel from outside in" strategy.
 *
 * Bomb placement strategy:
 * After solving, we look at the escape paths of tiles solved in the second half
 * of the solve order. We find hexes along those paths that were peeled EARLY
 * (first quarter) — meaning they'd already be gone by the time the trigger tile
 * is played. We convert those early-peeled hexes into bomb positions (removing
 * them from the playable set). The bomb's blast victims are neighbors of the bomb
 * hex that are still active when the trigger fires — and crucially, those victims
 * must all have been solved AFTER the trigger in the original solve order, so
 * removing them via explosion doesn't break solvability of the remaining tiles.
 */
export function generateSolvableBoard(
  radius = 2,
  changerCount = changerCountForRadius(radius),
): Board {
  const { nodes, nodeMap } = buildGridStructure(radius);

  const interiorIds = nodes
    .filter((n) => ALL_DIRECTIONS.every((d) => n.neighbors[d] !== null))
    .map((n) => n.id);

  const actualCount = Math.min(changerCount, interiorIds.length);
  const desiredBombs = bombCountForRadius(radius);

  for (;;) {
    const changerMap: ChangerMap = {};
    const shuffled = [...interiorIds].sort(() => Math.random() - 0.5);
    const changerPositions = new Set(shuffled.slice(0, actualCount));
    for (const id of changerPositions) {
      changerMap[id] = pickRandom(ALL_DIRECTIONS);
    }

    const playableNodes = nodes.filter((n) => !changerPositions.has(n.id));
    const remaining = new Set(playableNodes.map((n) => n.id));
    const solveOrder: SolveStep[] = [];
    let stuck = false;

    while (remaining.size > 0) {
      const peelable: { id: string; dirs: Direction[] }[] = [];
      for (const id of remaining) {
        const dirs = getEscapeDirs(id, remaining, nodeMap, changerMap);
        if (dirs.length > 0) {
          peelable.push({ id, dirs });
        }
      }

      if (peelable.length === 0) {
        stuck = true;
        break;
      }

      const chosen = pickRandom(peelable);
      const dir = pickInwardDir(chosen.id, chosen.dirs, nodeMap);
      solveOrder.push({
        id: chosen.id,
        dir,
        remainingSnapshot: new Set(remaining),
      });
      remaining.delete(chosen.id);
    }

    if (stuck) {
      continue;
    }

    const anyChangerUsed = solveOrder.some(
      ({ id, dir, remainingSnapshot }) =>
        traceHopsToChanger(id, dir, remainingSnapshot, nodeMap, changerMap) >=
        MIN_HOPS_TO_CHANGER,
    );
    if (!anyChangerUsed) {
      continue;
    }

    // --- Bomb placement ---
    const { bombMap, totalBlastVictims } = placeBombs(
      solveOrder,
      nodeMap,
      changerMap,
      changerPositions,
      desiredBombs,
    );

    // Assign arrows/colors only to non-bomb playable nodes
    for (const { id, dir } of solveOrder) {
      if (bombMap.has(id)) {
        continue;
      }
      const node = nodeMap[id];
      if (node) {
        node.arrowDirection = dir;
        node.color = DIRECTION_COLOUR[dir];
      }
    }

    // Remove bomb hexes from playable set — they don't get arrows or count as tiles
    const finalPlayable = playableNodes.filter((n) => !bombMap.has(n.id));
    // Clear arrow/color on bomb nodes
    for (const bid of bombMap) {
      const bn = nodeMap[bid];
      if (bn) {
        bn.arrowDirection = undefined;
        bn.color = undefined;
      }
    }

    return {
      nodes,
      nodeMap,
      changerMap,
      bombMap,
      playableNodes: finalPlayable,
      minMoves: finalPlayable.length - totalBlastVictims,
    };
  }
}

/**
 * Finds bomb positions from the solve order.
 *
 * A valid bomb candidate is a hex that:
 * 1. Was peeled EARLY in the solve order (first 30%) — so it's "easy" to remove
 *    and would already be gone well before the trigger tile is played.
 * 2. Lies on the escape path of a tile solved LATE (last 50%) — the trigger tile.
 * 3. Has at least one neighbor that is still active when the trigger fires AND
 *    that neighbor was solved AFTER the trigger in the original order.
 *
 * We convert the early-peeled hex into a bomb (removing it from playable tiles).
 * The trigger tile will slide through the bomb hex and detonate it.
 * Blast victims are removed by the explosion — since they were solved after the
 * trigger anyway, the remaining board is still solvable.
 */
function placeBombs(
  solveOrder: SolveStep[],
  nodeMap: NodeMap,
  changerMap: ChangerMap,
  changerPositions: Set<string>,
  desiredCount: number,
): { bombMap: BombMap; totalBlastVictims: number } {
  const bombMap: BombMap = new Set();
  let totalBlastVictims = 0;

  const solveIndex = new Map<string, number>();
  // Build a map of each tile's assigned arrow direction from the solve order
  const assignedDir = new Map<string, Direction>();
  for (let i = 0; i < solveOrder.length; i++) {
    const step = solveOrder[i];
    if (!step) {
      continue;
    }
    solveIndex.set(step.id, i);
    assignedDir.set(step.id, step.dir);
  }

  const totalSteps = solveOrder.length;
  // Bomb candidates: hexes peeled in the first 40%
  const earlyThreshold = Math.floor(totalSteps * 0.4);
  const earlyPeeled = new Set<string>();
  for (let i = 0; i < earlyThreshold; i++) {
    const earlyStep = solveOrder[i];
    if (earlyStep) {
      earlyPeeled.add(earlyStep.id);
    }
  }

  interface BombCandidate {
    bombHexId: string;
    triggerIndex: number;
    blastVictims: string[];
  }

  const candidates: BombCandidate[] = [];

  // Look at tiles solved in the latter 60% as potential triggers
  for (let si = totalSteps - 1; si >= Math.floor(totalSteps * 0.4); si--) {
    const step = solveOrder[si];
    if (!step) {
      continue;
    }

    // Trace the escape path at the time this tile was solved
    const escapePath = traceEscapePath(
      step.id,
      step.dir,
      step.remainingSnapshot,
      nodeMap,
      changerMap,
    );

    for (const hexId of escapePath) {
      // The bomb hex must have been an early-peeled playable tile
      if (!earlyPeeled.has(hexId)) {
        continue;
      }
      if (changerPositions.has(hexId)) {
        continue;
      }
      if (bombMap.has(hexId)) {
        continue;
      }

      const bombNode = nodeMap[hexId];
      if (!bombNode) {
        continue;
      }

      // Reject if any neighboring playable tile points directly at this bomb.
      // bombNode.neighbors[dir] is the neighbor in direction `dir` from the bomb.
      // From that neighbor's perspective, the bomb is in oppositeDir(dir).
      // So if the neighbor's arrow === oppositeDir(dir), it points straight at the bomb.
      let hasAdjacentPointer = false;
      for (const dir of ALL_DIRECTIONS) {
        const neighborId = bombNode.neighbors[dir];
        if (neighborId === null) {
          continue;
        }
        const neighborArrow = assignedDir.get(neighborId);
        if (neighborArrow !== undefined && neighborArrow === oppositeDir(dir)) {
          hasAdjacentPointer = true;
          break;
        }
      }
      if (hasAdjacentPointer) {
        continue;
      }

      // Check blast victims: neighbors still active when trigger fires,
      // solved AFTER the trigger in the original order
      const blastVictims: string[] = [];
      for (const dir of ALL_DIRECTIONS) {
        const neighborId = bombNode.neighbors[dir];
        if (
          neighborId !== null &&
          step.remainingSnapshot.has(neighborId) &&
          neighborId !== step.id
        ) {
          const victimIdx = solveIndex.get(neighborId);
          if (victimIdx !== undefined && victimIdx > si) {
            blastVictims.push(neighborId);
          }
        }
      }

      if (blastVictims.length > 0) {
        candidates.push({ bombHexId: hexId, triggerIndex: si, blastVictims });
      }
    }
  }

  // Prefer bombs triggered by the latest-solved tiles
  candidates.sort((a, b) => b.triggerIndex - a.triggerIndex);

  const usedTriggers = new Set<number>();
  const usedBombHexes = new Set<string>();
  for (const cand of candidates) {
    if (bombMap.size >= desiredCount) {
      break;
    }
    if (usedTriggers.has(cand.triggerIndex)) {
      continue;
    }
    if (usedBombHexes.has(cand.bombHexId)) {
      continue;
    }
    bombMap.add(cand.bombHexId);
    usedTriggers.add(cand.triggerIndex);
    usedBombHexes.add(cand.bombHexId);
    totalBlastVictims += cand.blastVictims.length;
  }

  return { bombMap, totalBlastVictims };
}

/**
 * Traces the escape path of a tile (the hexes it passes through).
 * The `remaining` set represents tiles still on the board at that point in the solve.
 * Hexes NOT in remaining (already peeled) are traversable.
 */
function traceEscapePath(
  nodeId: string,
  dir: Direction,
  remaining: Set<string>,
  nodeMap: NodeMap,
  changerMap: ChangerMap,
): string[] {
  const path: string[] = [];
  let currentDir = dir;
  const startNode = nodeMap[nodeId];
  if (!startNode) {
    return path;
  }
  let currentId = startNode.neighbors[currentDir];
  const visited = new Set<string>();

  while (currentId !== null) {
    // If we hit a tile still on the board, the path stops here
    if (remaining.has(currentId) && currentId !== nodeId) {
      return path;
    }
    path.push(currentId);

    const changerDir = changerMap[currentId];
    if (changerDir && changerDir !== currentDir) {
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      currentDir = changerDir;
    }

    const nextNode = nodeMap[currentId];
    currentId = nextNode ? nextNode.neighbors[currentDir] : null;
  }

  return path;
}

function traceHopsToChanger(
  nodeId: string,
  dir: Direction,
  remaining: Set<string>,
  nodeMap: NodeMap,
  changerMap: ChangerMap,
): number {
  const currentDir = dir;
  const startNode = nodeMap[nodeId];
  if (!startNode) {
    return -1;
  }
  let currentId = startNode.neighbors[currentDir];
  let hops = 0;

  while (currentId !== null) {
    if (remaining.has(currentId) && currentId !== nodeId) {
      return -1;
    }
    hops++;
    const changerDir = changerMap[currentId];
    if (changerDir !== undefined && changerDir !== currentDir) {
      return hops;
    }
    const nextNode = nodeMap[currentId];
    currentId = nextNode ? nextNode.neighbors[currentDir] : null;
  }
  return -1;
}

function pickInwardDir(
  nodeId: string,
  dirs: Direction[],
  nodeMap: NodeMap,
): Direction {
  const firstDir = dirs[0];
  if (dirs.length === 1 && firstDir) {
    return firstDir;
  }

  const node = nodeMap[nodeId];
  if (!node) {
    throw new Error(`Node ${nodeId} not found in nodeMap`);
  }
  const toCenterQ = -node.q;
  const toCenterR = -node.r;

  const scored = dirs.map((d) => {
    const { dq, dr } = AXIAL_OFFSETS[d];
    return { dir: d, score: dq * toCenterQ + dr * toCenterR };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScored = scored[0];
  if (!topScored) {
    throw new Error("No directions to score");
  }
  const best = scored.filter((s) => s.score === topScored.score);
  return pickRandom(best).dir;
}

function getEscapeDirs(
  nodeId: string,
  remaining: Set<string>,
  nodeMap: NodeMap,
  changerMap: ChangerMap,
): Direction[] {
  const node = nodeMap[nodeId];
  if (!node) {
    return [];
  }
  return ALL_DIRECTIONS.filter((dir) => {
    let currentDir: Direction = dir;
    let currentId = node.neighbors[currentDir];
    const visited = new Set<string>();
    while (currentId !== null) {
      if (remaining.has(currentId)) {
        return false;
      }
      const changerDir = changerMap[currentId];
      if (changerDir && changerDir !== currentDir) {
        if (visited.has(currentId)) {
          return false;
        }
        visited.add(currentId);
        currentDir = changerDir;
      }
      const nextNode = nodeMap[currentId];
      currentId = nextNode ? nextNode.neighbors[currentDir] : null;
    }
    return true;
  });
}
