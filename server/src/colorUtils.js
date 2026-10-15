export function rgbToXyz(r, g, b) {
  const [sR, sG, sB] = [r, g, b].map((c) => {
    const v = c / 255
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  })

  const x = (sR * 0.4124564 + sG * 0.3575761 + sB * 0.1804375) * 100
  const y = (sR * 0.2126729 + sG * 0.7151522 + sB * 0.0721750) * 100
  const z = (sR * 0.0193339 + sG * 0.1191920 + sB * 0.9503041) * 100

  return [x, y, z]
}

export function xyzToLab(x, y, z) {
  const Xn = 95.047
  const Yn = 100.0
  const Zn = 108.883

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)

  const fx = f(x / Xn)
  const fy = f(y / Yn)
  const fz = f(z / Zn)

  const L = 116 * fy - 16
  const a = 500 * (fx - fy)
  const b = 200 * (fy - fz)

  return [L, a, b]
}

export function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b)
  return xyzToLab(x, y, z)
}

export function calculateDeltaE(rgb1, rgb2) {
  const [L1, a1, b1] = rgbToLab(...rgb1)
  const [L2, a2, b2] = rgbToLab(...rgb2)

  const dL = L1 - L2
  const da = a1 - a2
  const db = b1 - b2

  return Math.sqrt(dL * dL + da * da + db * db)
}
