import request from 'supertest'
import jwt from 'jsonwebtoken'
import sharp from 'sharp'
import { app } from '../src/server.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

describe('E2E /api/scan/analyze', function () {
  it('accepts image and returns analysis', async function () {
    // inject fake prisma
    const fakeDb = {
      user: {
        findUnique: async ({ where: { email } }) => ({ id: 'user-test-id', email }),
      },
      scanRecord: {
        create: async ({ data }) => ({ id: 'scan-1', ...data, createdAt: new Date() }),
      },
    }

    app.locals.prisma = fakeDb
    app.locals.uploadBufferToS3 = async (buffer, key) => `https://example.com/${key}`

    const token = jwt.sign({ id: 'user-test-id', email: 'test@example.com' }, JWT_SECRET)

    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 200, g: 80, b: 120 },
      },
    }).png().toBuffer()

    const res = await request(app)
      .post('/api/scan/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', buffer, { filename: 'capture.png', contentType: 'image/png' })

    if (res.status !== 200) {
      // show response body for easier debugging
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`)
    }

    if (!res.body.analysis || !res.body.record) throw new Error('Missing analysis or record')
  })
})
