function hexToHsl(hex) {
  const h = hex.replace('#', '')
  let r = parseInt(h.substring(0, 2), 16) / 255
  let g = parseInt(h.substring(2, 4), 16) / 255
  let b = parseInt(h.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue, sat, lit = (max + min) / 2

  if (max === min) {
    hue = sat = 0
  } else {
    const d = max - min
    sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) hue = ((b - r) / d + 2) / 6
    else hue = ((r - g) / d + 4) / 6
  }

  return { h: hue * 360, s: sat * 100, l: lit * 100 }
}

function hslToHex({ h, s, l }) {
  h /= 360; s /= 100; l /= 100
  const clamp = v => Math.max(0, Math.min(255, Math.round(v * 255)))

  if (s === 0) {
    const v = clamp(l)
    return `#${[v, v, v].map(c => c.toString(16).padStart(2, '0')).join('')}`
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = clamp(hue2rgb(p, q, h + 1/3))
  const g = clamp(hue2rgb(p, q, h))
  const b = clamp(hue2rgb(p, q, h - 1/3))

  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

function shiftHsl(base, dS, dL) {
  return hslToHex({
    h: base.h,
    s: Math.max(0, Math.min(100, base.s + dS)),
    l: Math.max(0, Math.min(100, base.l + dL)),
  })
}

export function facePalette(baseHex) {
  if (!baseHex || !baseHex.startsWith('#')) {
    return { top: baseHex, right: baseHex, left: baseHex, bottom: baseHex }
  }

  const hsl = hexToHsl(baseHex)

  return {
    top:    baseHex,
    right:  shiftHsl(hsl, 4, -10),
    left:   shiftHsl(hsl, 6, -18),
    bottom: shiftHsl(hsl, 8, -26),
  }
}
