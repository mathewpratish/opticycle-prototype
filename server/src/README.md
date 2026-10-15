API Server README

Run locally:
1. Ensure PostgreSQL is running and DATABASE_URL in .env points to a valid DB.
2. From server/ run `npm run prisma:generate` then `npm run prisma:migrate`.
3. Start server: `npm run dev`.

S3 Image Upload
- Set the following env vars in `server/.env` or your environment:
	- `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- When `S3_BUCKET` is present the API uploads processed images to S3 and stores the public S3 URL in the database. If not configured, images are saved locally under `uploads/`.

Example local run (Windows PowerShell):
```
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/server.js
```

Run tests (uses Node's built-in test runner and Supertest):
```
cd server
npm install
npm test
```
The test suite now uses Mocha + Chai + Supertest. If you run into registry/version issues, run `npm install` locally to resolve dependencies before `npm test`.

Endpoints:
- POST /api/auth/register { email, password }
- POST /api/auth/login { email, password }
- POST /api/scan/analyze (auth, multipart/form-data: image)
- GET /api/scan/history (auth)

Database and integration status
- Database type: PostgreSQL (configured via `prisma/schema.prisma` datasource). The Prisma schema defines `User` and `ScanRecord` models.
- Is DB integrated: the Prisma schema and client are present in the repo, but you must run `npx prisma generate` and apply migrations (`npx prisma migrate dev`) locally or in CI to create the tables. Until migrations are applied, the API will not persist scan records.

Frontend integration notes
- CORS: the server restricts origins to the comma-separated `FRONTEND_URL` values (or `http://localhost:5173` by default). Set this to the exact deployed frontend origin(s), without trailing slashes.
- API client: see `src/apiClient.js` in the frontend for example usage of auth and scan calls.
- OpenAPI: `server/openapi.yaml` contains a minimal spec you can import into Postman or similar.

Deploy the API to Vercel as a separate project by selecting this repository and setting **Root Directory** to `server`. Vercel will build `api/[...path].js` as a serverless Express handler. Set `DATABASE_URL`, a strong `JWT_SECRET`, and `FRONTEND_URL` in the Vercel project's environment variables. Apply the Prisma migrations to the hosted PostgreSQL database with `npm run prisma:deploy` before using the API.

Vercel's filesystem is temporary, so scan image storage must use S3. Configure `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` in Vercel; the bucket must allow the API's configured public-read object uploads. Without S3, scan analysis returns a clear `503` rather than saving images to temporary storage. The API health check is available at `/api/health`.

S3 / storage notes
- The server uploads processed images to S3 when `S3_BUCKET` is set; otherwise images are saved locally under `uploads/` and served from `/uploads`.
- For CI and local integration we support LocalStack via `AWS_ENDPOINT`.

Quick local setup example
```
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
node src/server.js
```
