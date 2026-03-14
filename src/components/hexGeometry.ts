import type { Direction, ExtrudedHexFaces } from "../types";
import { HexDirection } from "../utils/hexDirections";

export const ARROW_ROTATION: Record<Direction, number> = {
  [HexDirection.North]: 0,
  [HexDirection.NorthEast]: 60,
  [HexDirection.SouthEast]: 120,
  [HexDirection.South]: 180,
  [HexDirection.SouthWest]: 240,
  [HexDirection.NorthWest]: 300,
};

const DEPTH_FACTOR = 0.28;

interface Vertex {
  x: number;
  y: number;
}

function rawHexVerts(size: number): Vertex[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return { x: size * Math.cos(angle), y: size * Math.sin(angle) };
  });
}

export function hexPoints(size: number): string {
  return rawHexVerts(size)
    .map((v) => `${v.x},${v.y}`)
    .join(" ");
}

function toPointsStr(verts: Vertex[]): string {
  return verts.map((v) => `${v.x},${v.y}`).join(" ");
}

export function extrudedHex(size: number): ExtrudedHexFaces {
  const depth = size * DEPTH_FACTOR;
  const verts = rawHexVerts(size);
  const topVerts = verts.map((v) => ({ x: v.x, y: v.y - depth }));

  // rawHexVerts always returns exactly 6 vertices (indices 0–5)
  const v = (arr: Vertex[], i: number): Vertex => {
    const el = arr[i];
    if (!el) {
      throw new Error(`Missing vertex at index ${i}`);
    }
    return el;
  };

  return {
    top: toPointsStr(topVerts),
    bottom: toPointsStr([
      v(topVerts, 2),
      v(topVerts, 1),
      v(verts, 1),
      v(verts, 2),
    ]),
    left: toPointsStr([
      v(topVerts, 3),
      v(topVerts, 2),
      v(verts, 2),
      v(verts, 3),
    ]),
    right: toPointsStr([
      v(topVerts, 1),
      v(topVerts, 0),
      v(verts, 0),
      v(verts, 1),
    ]),
    depth,
  };
}

export function arrowPath(size: number): string {
  const hw = size * 0.05;
  const hh = size * 0.18;
  const tip = -size * 0.42;
  const base = tip + size * 0.28;
  const tail = size * 0.42;

  return [
    `M 0,${tip}`,
    `L ${hh},${base}`,
    `L ${hw},${base}`,
    `L ${hw},${tail}`,
    `L ${-hw},${tail}`,
    `L ${-hw},${base}`,
    `L ${-hh},${base}`,
    `Z`,
  ].join(" ");
}

export function changerChevronPath(size: number): string {
  const s = size * 0.3;
  const gap = size * 0.38;
  const chevrons: string[] = [];
  for (let i = 0; i < 2; i++) {
    const cy = gap * (i - 0.5);
    chevrons.push(
      `M ${-s * 0.55},${cy + s * 0.4}`,
      `L 0,${cy - s * 0.4}`,
      `L ${s * 0.55},${cy + s * 0.4}`,
    );
  }
  return chevrons.join(" ");
}
