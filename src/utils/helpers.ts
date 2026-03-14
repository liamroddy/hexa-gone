export function pickRandom<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error("Cannot pick from empty array");
  }
  return item;
}
