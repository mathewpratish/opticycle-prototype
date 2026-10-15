import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import sharp from 'sharp'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { rgbToLab, calculateDeltaE } from './colorUtils.js'

dotenv.config()

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
// Allow requests from the frontend. Configure `FRONTEND_URL` in env for production.
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(helmet())
app.use('/uploads', express.static(UPLOAD_DIR))

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 })
app.use(limiter)

const upload = multer({ dest: path.join(UPLOAD_DIR, 'tmp') })

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

// S3 client (if configured). upload function can be injected via `app.locals.uploadBufferToS3` in tests.
const S3_BUCKET = process.env.S3_BUCKET || ''
let s3Client = null
if (S3_BUCKET) {
  const s3Opts = { region: process.env.AWS_REGION || 'us-east-1' }
  if (process.env.AWS_ENDPOINT) {
    s3Opts.endpoint = process.env.AWS_ENDPOINT
    s3Opts.forcePathStyle = true
  }
  s3Client = new S3Client(s3Opts)
}

async function uploadBufferToS3(buffer, key, contentType = 'application/octet-stream') {
  if (!s3Client || !S3_BUCKET) return null
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  })
  await s3Client.send(cmd)

  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'Missing auth' })
  const [, token] = auth.split(' ')
  try {
    const data = jwt.verify(token, JWT_SECRET)
    req.user = data
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.post('/api/auth/guest', async (req, res) => {
  const db = req.app.locals.prisma || prisma
  const email = `guest-${uuidv4()}@guest.opticycle.local`
  const passwordHash = await bcrypt.hash(`${uuidv4()}${uuidv4()}`, 10)
  const user = await db.user.create({ data: { email, passwordHash } })
  const token = signToken({ id: user.id, email: user.email, guest: true })
  res.json({ token })
})

app.post('/api/auth/register', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = req.body.password
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Enter a valid email and a password between 8 and 128 characters.' })
  }

  const db = req.app.locals.prisma || prisma

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.create({ data: { email, passwordHash } })
  const token = signToken({ id: user.id, email: user.email })
  res.json({ token })
})

app.post('/api/auth/login', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = req.body.password
  if (!email || typeof password !== 'string') return res.status(400).json({ error: 'Enter your email and password.' })

  const db = req.app.locals.prisma || prisma

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

  const token = signToken({ id: user.id, email: user.email })
  res.json({ token })
})

app.post('/api/scan/analyze', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    let buffer
    if (req.file) {
      buffer = fs.readFileSync(req.file.path)
    } else if (req.body.imageBase64) {
      buffer = Buffer.from(req.body.imageBase64, 'base64')
    } else {
      return res.status(400).json({ error: 'No image' })
    }

    // Load image into Sharp
    const size = 100
    const cropped = await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer()

    // Average RGB
    let r = 0
    let g = 0
    let b = 0
    const pixels = cropped.length / 3
    for (let i = 0; i < cropped.length; i += 3) {
      r += cropped[i]
      g += cropped[i + 1]
      b += cropped[i + 2]
    }
    r = Math.round(r / pixels)
    g = Math.round(g / pixels)
    b = Math.round(b / pixels)

    // reference colors
    const anchors = [
      { id: 1, hex: '#D9385C', rgb: [217, 56, 92], label: 'Optimal', remedies: ['Targeted NSAIDs', 'Magnesium Glycinate 300mg', 'Heat therapy'] },
      { id: 2, hex: '#B33B72', rgb: [179, 59, 114], label: 'Mild Prostaglandins', remedies: ['Warm compress', 'Vitamin D', 'Hydration'] },
      { id: 3, hex: '#7B3F9A', rgb: [123, 63, 154], label: 'Moderate Inflammation', remedies: ['Anti-inflammatory care', 'Pelvic rest', 'Omega-3'] },
      { id: 4, hex: '#4B45A8', rgb: [75, 69, 168], label: 'High Inflammatory', remedies: ['Consult clinician', 'Pain management', 'Lifestyle adjustments'] },
      { id: 5, hex: '#5B7F9E', rgb: [91, 127, 158], label: 'Critical Biomarker', remedies: ['Urgent evaluation', 'Track symptoms', 'Avoid self-treatment'] },
    ]

    let best = anchors[0]
    let bestDist = Infinity
    for (const a of anchors) {
      const d = calculateDeltaE([r, g, b], a.rgb)
      if (d < bestDist) {
        bestDist = d
        best = a
      }
    }

    const lab = rgbToLab(r, g, b)

    // Process and persist image. Prefer injected upload function, then S3, then local save.
    const filename = `${uuidv4()}.png`
    const outPath = path.join(UPLOAD_DIR, filename)

    // create a processed buffer (resized PNG)
    const processedBuffer = await sharp(buffer).resize(640).png().toBuffer()

    // allow test to inject upload function
    const uploadFn = req.app.locals.uploadBufferToS3 || uploadBufferToS3

    let imageUrl = null
    if (uploadFn) {
      try {
        const key = `scans/${filename}`
        imageUrl = await uploadFn(processedBuffer, key, 'image/png')
      } catch (err) {
        console.warn('Configured upload function failed, falling back to local save:', err.message || err)
      }
    }

    if (!imageUrl) {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      fs.writeFileSync(outPath, processedBuffer)
      imageUrl = `/uploads/${filename}`
    }

    // persist
    const db = req.app.locals.prisma || prisma
    const record = await db.scanRecord.create({
      data: {
        userId: req.user.id,
        imageUrl,
        detectedHex: best.hex,
        labValues: { L: lab[0], a: lab[1], b: lab[2] },
        tier: best.id,
        statusLabel: best.label,
        remedies: best.remedies,
      },
    })

    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)

    res.json({ record, analysis: { rgb: [r, g, b], lab, tier: best.id, label: best.label, distance: bestDist } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/scan/history', authMiddleware, async (req, res) => {
  const db = req.app.locals.prisma || prisma
  const scans = await db.scanRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })
  res.json({ scans })
})

app.get('/health', async (req, res) => {
  try {
    const db = req.app.locals.prisma || prisma
    await db.$queryRaw`SELECT 1`
    res.json({ ok: true, status: 'healthy' })
  } catch (error) {
    res.status(503).json({ ok: false, status: 'unhealthy', error: error.message })
  }
})

// Export app for testing. Only listen when not running tests.
const port = process.env.PORT || 4000
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log('API listening on', port))
}

export { app }
