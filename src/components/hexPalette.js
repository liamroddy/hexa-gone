/**
 * Derives a 4-side colour palette from a single base (top-face) colour.
 *
 * top   – the original colour (brightest, fully lit)
 * right – slightly darker
 * left  – darker still
 * bottom – darkest face
 */

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

export function facePalette(baseHex) {
  // Handle non-hex colours (e.g. rgba from blocked animation) – just tint naively
  if (!baseHex || !baseHex.startsWith('#')) {
    return { top: baseHex, right: baseHex, left: baseHex, bottom: baseHex }
  }

  const hsl = rgbToHsl(hexToRgb(baseHex))

  const shift = (dS, dL) => {
    const ns = Math.max(0, Math.min(100, hsl.s + dS))
    const nl = Math.max(0, Math.min(100, hsl.l + dL))
    return rgbToHex(hslToRgb({ h: hsl.h, s: ns, l: nl }))
  }

  return {
    top:    baseHex,
    right:  shift(4, -10),   // slightly darker + more saturated
    left:   shift(6, -18),   // darker still
    bottom: shift(8, -26),   // darkest
  }
}
