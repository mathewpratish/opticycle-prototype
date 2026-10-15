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

## Tests

From `server/`, run `npm test`.

> This is a prototype. Do not rely on its color analysis or suggested remedies for medical decisions.
