/** Hex direction labels */
export type Direction = 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW'

/** Axial coordinate offset for a direction */
export interface AxialOffset {
  dq: number
  dr: number
}

/** A single hex node on the board */
export interface HexNodeData {
  id: string
  q: number
  r: number
  arrowDirection: Direction | undefined
  color?: string
  neighbors: Record<Direction, string | null>
}

/** Map of node id → HexNodeData */
export type NodeMap = Record<string, HexNodeData>

/** Map of node id → changer direction */
export type ChangerMap = Record<string, Direction>

/** Set of node ids that contain bombs */
export type BombMap = Set<string>

/** Board returned by the generator */
export interface Board {
  nodes: HexNodeData[]
  nodeMap: NodeMap
  changerMap: ChangerMap
  bombMap: BombMap
  playableNodes: HexNodeData[]
}

/** A segment of a slide path (one direction, N hops) */
export interface SlideSegment {
  dir: Direction
  count: number
}

/** Result of resolving a slide */
export type SlideResult =
  | { result: 'escape'; path: string[]; segments: SlideSegment[] }
  | { result: 'blocked'; blockedById: string; path: string[]; segments: SlideSegment[] }
  | { result: 'bomb'; bombId: string; path: string[]; segments: SlideSegment[] }

/** Animation state label */
export type AnimStateName = 'rolling' | 'falling' | 'returning' | 'hit' | 'gone' | 'exploding'

/** Data carried alongside an animation state */
export interface AnimData {
  currentHop?: number
  hopProgress?: number
  stepX?: number
  stepY?: number
  baseOffsetX?: number
  baseOffsetY?: number
  currentDir?: Direction
  hitAtHops?: number
  flashT?: number
  explodeT?: number
}

/** Entry stored in the animStates map */
export interface AnimEntry {
  state: AnimStateName
  data: AnimData
}

/** Pixel coordinate */
export interface Point {
  x: number
  y: number
}

/** Layout helpers returned by createLayout */
export interface HexLayout {
  cellWidth: number
  cellHeight: number
  hexToPixel: (q: number, r: number) => Point
  stepPixelForDir: (dir: Direction) => Point
}

/** Difficulty config */
export interface DifficultyConfig {
  radius: number
  label: string
}

/** Page names in the app */
export type PageName = 'splash' | 'game' | 'howto'

/** Difficulty keys */
export type DifficultyKey = 'easy' | 'medium' | 'hard'

/** Faces of the extruded hex (SVG point strings) */
export interface ExtrudedHexFaces {
  top: string
  bottom: string
  left: string
  right: string
  depth: number
}

/** Colour palette for hex faces */
export interface FacePaletteResult {
  top: string
  right: string
  left: string
  bottom: string
}

/** Computed roll values for rendering a hex node */
export interface RollValues {
  translateX: number
  translateY: number
  scaleX: number
  scaleY: number
  opacity: number
  fillColor: string
  showBottom: boolean
  rotateZ: number
  dirAngle: number
}

/** Input to computeRollValues */
export interface RollInput {
  animState: AnimStateName | undefined
  animData: AnimData
  direction: Direction | undefined
  size: number
  color: string | undefined
}

/** Hop offset used during animation orchestration */
export interface HopOffset {
  x: number
  y: number
  stepX: number
  stepY: number
  dir: Direction
}

/** Callback to set a node's animation state */
export type SetNodeAnimFn = (nodeId: string, value: AnimEntry | null) => void
