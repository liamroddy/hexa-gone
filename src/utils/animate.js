export function animateValue(duration, onFrame, onDone) {
  const start = performance.now()
  const step = (now) => {
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
