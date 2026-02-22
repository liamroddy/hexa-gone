export const DIRECTION_COLOUR = {
  N:  '#ff2d2d', // hot red
  NE: '#ff7700', // blaze orange
  SE: '#00b894', // jungle green
  S:  '#f9c200', // sunflower yellow
  SW: '#0077ff', // electric blue
  NW: '#a020f0', // deep purple
}

// Derived for any code that still references HEX_COLOURS
export const HEX_COLOURS = Object.values(DIRECTION_COLOUR)
