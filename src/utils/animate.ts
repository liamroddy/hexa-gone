export function animateValue(
  duration: number,
  onFrame: (t: number) => void,
  onDone?: () => void,
): void {
  const start = performance.now()
  const step = (now: number): void => {
    const t = Math.min((now - start) / duration, 1)
    onFrame(t)
    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      onDone?.()
    }
  }
  requestAnimationFrame(step)
}
