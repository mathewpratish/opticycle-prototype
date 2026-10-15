import { expect } from 'chai'
import supertest from 'supertest'
import sharp from 'sharp'
import { app } from '../src/server.js'

let request

before(async function () {
  request = supertest(app)
})

describe('S3 upload integration (mocked)', function () {
  it('uploads to injected S3 upload function and creates scan record', async function () {
    const fakeUser = { id: 'user-1', email: 'test@example.com', passwordHash: 'x' }
    const createdScans = []
    const users = new Map()

    const fakeDb = {
      user: {
        findUnique: async ({ where }) => {
          return users.get(where.email) || null
        },
        create: async ({ data }) => {
          const user = { id: 'user-1', ...data }
          users.set(data.email, user)
          return user
        },
      },
      scanRecord: {
        create: async ({ data }) => {
          const rec = { id: `scan-${createdScans.length + 1}`, ...data }
          createdScans.push(rec)
          return rec
        },
        findMany: async () => createdScans,
      },
    }

    app.locals.prisma = fakeDb
    app.locals.uploadBufferToS3 = async (buffer, key) => {
      // verify PNG signature
      const sig = buffer.slice(0, 8).toString('hex')
      expect(sig).to.match(/^89504e47/)
      return `https://s3.mock/${key}`
    }

    await request.post('/api/auth/register')
      .send({ email: fakeUser.email, password: 'short' })
      .expect(400)

    // register/login to obtain token (register uses fakeDb)
    const registerRes = await request.post('/api/auth/register').send({ email: ` ${fakeUser.email.toUpperCase()} `, password: 'test-password-123' }).expect(200)
    const token = registerRes.body.token
    expect(token).to.be.a('string')

    const buffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 200, g: 80, b: 120 },
      },
    }).png().toBuffer()

    const res = await request.post('/api/scan/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', buffer, { filename: 'capture.png', contentType: 'image/png' })
      .expect(200)

    expect(res.body).to.have.property('analysis')
    expect(res.body).to.have.property('record')
    expect(res.body.record.imageUrl).to.match(/^https:\/\/s3\.mock\//)

  })
})
