# Online Banking (Mifos Banca Web)

Demonstration prototype of an electronic banking channel for **Mifos**, focused on self-service for personal and business clients. It showcases balances, transfers, approvals (dual signature for companies), audit log, and enrollment flows.

This is a **demo only**. It does not connect to real banking systems or move real money.

## Features

- Client number + password login with category-2 style controls
- Enrollment / activation flow
- Personal and business (empresas) segments
- Transfers between own accounts and to Mifos beneficiaries
- Dual-signature approvals for business users
- Session timeout and inactivity handling
- OTP step for sensitive operations
- Internationalization (**i18n**) for **es-MX** (default) and **en-US**

## Tech stack

- React 19 + TypeScript
- Vite
- TanStack Router / Query
- Zustand (persisted session)
- Tailwind CSS + Radix UI primitives
- date-fns
- Lightweight custom i18n (JSON locale files)

## Download the fixed project

A complete snapshot of this repository (including i18n, README, CONTRIBUTING, Dockerfile, and docker-compose) is packaged as a zip archive for convenience. After downloading, extract and follow the install or Docker steps below.

> **In this chat / sandbox:** use the download control next to the `online-banking-fixed.zip` attachment (or path under `/home/workdir/artifacts/`).

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
git clone https://github.com/openMF/online-banking.git
cd online-banking
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) (or the host/port configured by the environment).

### Demo credentials

| Segment   | Client number | Password  | Notes                          |
|-----------|---------------|-----------|--------------------------------|
| Personas  | `344988355`   | `Mifos#26`| Noé López Guzmán               |
| Empresas  | `880214001`   | `Mifos#26`| Taller Industrial del Bajío    |

Activation code for enrollment (demo): see `DEMO_ACTIVATION_CODE` in `src/lib/banca/demo.ts`.

## Internationalization (i18n)

User-facing strings live under `src/i18n/locales/`:

| File            | Locale              |
|-----------------|---------------------|
| `es-MX.json`    | Spanish (Mexico) – default |
| `en-US.json`    | English (United States)    |

### Usage

```ts
import { t, setLocale, getLocale } from "@/i18n";

// Simple key
t("app.hero");

// With interpolation
t("landing.demoPassword", { password: "Mifos#26" });

// Switch locale at runtime
setLocale("en-US");
```

A language switcher (ES / EN) is available on the public screens header for demonstration.

### Adding or changing strings

1. Add the key to both `es-MX.json` and `en-US.json` (keep structures in sync).
2. Replace hardcoded text in components with `t("your.key")`.
3. Prefer nested keys grouped by screen or domain (`nav.*`, `login.*`, `dashboard.*`, …).

Navigation labels and screen titles are resolved through `getNav()` and `getScreenTitle()` in `src/lib/banca/model.ts` so they always respect the active locale.

## Project structure (relevant parts)

```
src/
  components/banca/     # Public (landing/login/register) and private (app shell) UI
  i18n/
    index.ts            # t(), setLocale(), getLocale()
    locales/
      es-MX.json
      en-US.json
  lib/banca/            # Domain model, demo data, Zustand store
  routes/               # TanStack Router entry
```

## Scripts

| Command           | Description                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Start Vite dev server                |
| `npm run build`   | Production build + DB migrate        |
| `npm run typecheck` | TypeScript check                   |
| `npm run lint`    | ESLint                               |
| `npm test`        | Unit tests                           |

## Docker (Nginx)

The image is a **multi-stage** build: Node compiles the app, then **Nginx** serves the static client on port 80.

```bash
# Build and run (maps host 8080 → container 80)
docker compose up --build -d

# Logs
docker compose logs -f

# Stop
docker compose down
```

Open [http://localhost:8080](http://localhost:8080).

| File                 | Role                                      |
|----------------------|-------------------------------------------|
| `Dockerfile`         | Multi-stage Node build → Nginx Alpine     |
| `nginx.conf`         | SPA fallback, gzip, health endpoint       |
| `docker-compose.yml` | Single service on port 8080               |
| `.dockerignore`      | Keeps the build context lean              |

Health check: `GET /health` returns `ok`.

See also [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

See repository license (MPL-2.0 where applicable for Mifos Initiative projects).

## Disclaimer

This application is a **prototype for demonstration and educational purposes**. It is not production software, is not authorized for real financial operations, and must not be used to process real customer funds.
