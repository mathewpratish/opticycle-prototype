# OptiCycle

OptiCycle is a React/Vite frontend with an Express API and PostgreSQL database.

## Run locally (Windows)

Prerequisites: Node.js 20 or newer and Docker Desktop. From the project root, run:

```powershell
npm.cmd run start:local
```

The launcher installs dependencies only if they are missing, starts PostgreSQL if needed, applies existing migrations, and opens the API and frontend in separate terminals. Subsequent starts skip dependency installation and reuse healthy services. The first run still needs to download dependencies and the PostgreSQL image.

Open `http://localhost:5173`; the app starts a private guest session automatically, so no sign-in is required. Camera access requires localhost or HTTPS. Capture a photo, review it, and explicitly select **Analyse Patch** to send it to the API. Use the history icon to view scans saved for this browser.

The local API stores uploaded images in `server/uploads` by default. S3 is optional.

## Production and clinical limitations

This repository remains a prototype, not a clinically validated or production-ready medical application. Its color tiers and remedy suggestions have not been validated for diagnosis or treatment. Before any real-world clinical use, qualified clinicians and relevant regulatory experts must validate the method, claims, instructions, and safety.

Before production deployment, configure strong secret management, HTTPS, production database and image storage, backups and retention policies, monitoring, rate limits, privacy/consent notices, and a security review. Do not use the development secrets or local Docker credentials for a public deployment.

## Deploy to Vercel

The root [`vercel.json`](./vercel.json) configures one Vercel project with two services: the Vite frontend (`app`) and Express API (`server`). The `/api/*` rewrite sends API requests to the backend; all other paths go to the frontend. In production, the frontend calls the API on this same origin. The API includes a Vercel serverless handler at `server/api/[...path].js`; its health check is available at `/api/health`.

Before deploying, provision a hosted PostgreSQL database and an S3 bucket. In the Vercel project's environment variables, set:

- `DATABASE_URL` to the hosted PostgreSQL connection string.
- `JWT_SECRET` to a strong, randomly generated secret.
- `FRONTEND_URL` to the exact frontend origin (for example, `https://opticycle-prototype.vercel.app`). Multiple allowed origins can be comma-separated.
- `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` for persistent scan-image storage. The bucket must permit the API's public-read uploads.

Apply the database migrations from the `server` directory with `npm run prisma:deploy` using the hosted `DATABASE_URL`. Import the repository into Vercel with the repository root as the project root so Vercel can read `vercel.json` and build both services together. No `VITE_API_URL` is required for this same-origin setup.

## Tests

From `server/`, run `npm test`.

> This is a prototype. Do not rely on its color analysis or suggested remedies for medical decisions.
