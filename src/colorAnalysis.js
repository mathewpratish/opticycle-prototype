export const TIER_DEFINITIONS = [
  {
    id: 1,
    label: 'Tier 1',
    name: 'Optimal',
    color: '#f68aa8',
    rgb: [217, 56, 92],
    status: 'Balanced vaginal pH and patch tone',
    remedies: ['Targeted NSAIDs', 'Magnesium Glycinate 300mg', 'Heat therapy'],
  },
  {
    id: 2,
    label: 'Tier 2',
    name: 'Mild',
    color: '#d76fb0',
    rgb: [190, 82, 140],
    status: 'Elevated inflammatory prostaglandins',
    remedies: ['Warm compress', 'Vitamin D', 'Hydration'],
  },
  {
    id: 3,
    label: 'Tier 3',
    name: 'Moderate',
    color: '#8b5cc7',
    rgb: [118, 92, 193],
    status: 'Moderate inflammatory activity',
    remedies: ['Anti-inflammatory care', 'Pelvic rest', 'Omega-3'],
  },
  {
    id: 4,
    label: 'Tier 4',
    name: 'Severe',
    color: '#5c6dde',
    rgb: [86, 109, 222],
    status: 'Marked inflammatory imbalance',
    remedies: ['Consult clinician', 'Pain management', 'Lifestyle adjustments'],
  },
  {
    id: 5,
    label: 'Tier 5',
    name: 'Critical',
    color: '#7ca7cf',
    rgb: [124, 167, 207],
    status: 'Persistent irritation or atypical hue',
    remedies: ['Urgent evaluation', 'Track symptoms', 'Avoid self-treatment'],
  },
]

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

export function getNearestTier(rgb) {
  let best = TIER_DEFINITIONS[0]
  let smallestDistance = Number.POSITIVE_INFINITY

  TIER_DEFINITIONS.forEach((tier) => {
    const distance = calculateDeltaE(rgb, tier.rgb)
    if (distance < smallestDistance) {
      smallestDistance = distance
      best = tier
    }
  })

  return {
    ...best,
    distance: smallestDistance,
  }
}

export function averageRgbFromCanvas(ctx, width, height, x, y, cropSize) {
  const imageData = ctx.getImageData(x, y, cropSize, cropSize).data
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let pixelCount = 0

  for (let i = 0; i < imageData.length; i += 4) {
    totalR += imageData[i]
    totalG += imageData[i + 1]
    totalB += imageData[i + 2]
    pixelCount += 1
  }

  return [
    Math.round(totalR / pixelCount),
    Math.round(totalG / pixelCount),
    Math.round(totalB / pixelCount),
  ]
}

export function analyzeCapture(video) {
  const cropSize = 100
  const canvas = document.createElement('canvas')
  canvas.width = cropSize
  canvas.height = cropSize

  const context = canvas.getContext('2d')

  const sourceX = Math.max(0, Math.round((video.videoWidth - cropSize) / 2))
  const sourceY = Math.max(0, Math.round((video.videoHeight - cropSize) / 2))

  context.drawImage(
    video,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    cropSize,
    cropSize,
  )

  const rgb = averageRgbFromCanvas(context, cropSize, cropSize, 0, 0, cropSize)
  const tier = getNearestTier(rgb)

  return {
    rgb,
    tier,
    dataUrl: canvas.toDataURL('image/png'),
  }
}
