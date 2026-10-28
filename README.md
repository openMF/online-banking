# MIFOS Digital Banking Experience

A complete Spanish-language React and TypeScript experience inspired by MIFOS's identity and the personal/business journeys in [Mifos Online Banking](https://github.com/openMF/online-banking).

## Run

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

The entry point is `src/App.tsx`. The supplied Vite configuration produces a static production build in `dist/`. Deploy the entire directory, including its images and fonts, at the site root.

## Self Service runtime configuration (MX-453)

MX-453 establishes public endpoint and tenant configuration. MX-452 consumes it for the provisional
customer sign-in described below. Demo banking data remains separate; this is not ready for live banking.

The standalone demo requires no backend settings. Leave **both** settings absent or empty to disable
API configuration; the generated public resource is JSON `null`. Supplying either setting requires a
complete, valid pair. Neither endpoint nor tenant has a fallback or default:

| Variable                 | Meaning                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SELF_SERVICE_BASE_URL`  | Complete Self Service API root, e.g. `https://localhost:8443/fineract-provider/api/v1/self`. Includes the origin, any reverse-proxy/deployment prefix, and `/v1/self`. |
| `SELF_SERVICE_TENANT_ID` | Tenant for the `Fineract-Platform-TenantId` request header. 1–100 ASCII letters, digits, underscores or hyphens; starts with a letter or digit.                 |

Trailing slashes are removed. HTTPS is mandatory in production, including loopback deployments.
Only Vite development permits HTTP on `localhost`, `127.0.0.1` or `[::1]`; lookalike hostnames and
private network HTTP are rejected. URLs with credentials, queries, fragments, encoded path segments,
dot segments, repeated `/v1/self`, or missing `/v1/self` are rejected. Reverse-proxy prefixes such as
`/gateway/fineract-provider/api/v1/self` are preserved.

The runtime contract uses a complete API root rather than the earlier `SELF_SERVICE_ENDPOINT` split.
There is no runtime API-key setting. The independently added step-up client still has its own build-time
`VITE_SELF_SERVICE_*` settings (see below); these are not aliases for the runtime contract. This ticket's
runtime loader does not reconfigure that client's synchronous configuration module.
Never place administrator credentials, service keys, passwords, or private tokens in these settings,
in a `VITE_*` variable, or in `public/`: browser configuration is visible to everyone.

### Local development

Use Node.js 24 (also used by Docker's build stage), install with `npm ci`, then either copy
`.env.example` to an ignored `.env` and edit it, or supply system environment variables:

```sh
SELF_SERVICE_BASE_URL=http://localhost:8443/fineract-provider/api/v1/self \
SELF_SERVICE_TENANT_ID=default npm run dev
```

Vite reads these same names and serves validated JSON at `/runtime-config.json` with `no-store`.
Restart the development server after changing settings. These settings are never injected into the
production bundle by the build. The runtime loader does not read `VITE_*` variables.

### Docker Compose

```sh
# Standalone demo: no .env or backend needed.
docker compose up --build -d web

# Optional public configuration for customer sign-in:
cp .env.example .env
# Set BOTH settings; the URL must use HTTPS, then recreate the container.
```

Compose passes only the two allowlisted settings to `web`, defaulting both to empty; exported shell
values take precedence over `.env`. The official Nginx entrypoint runs `docker/40-self-service-config.sh`,
which uses Node to share
the browser's TypeScript validator and safely serialize `/usr/share/nginx/html/runtime-config.json`.
The final image includes Node for this startup step; it does not run an application server. Invalid or
incomplete settings prevent Nginx from starting and emit an error without echoing environment values.
When both are absent/empty, startup succeeds with JSON `null`, which disables API consumers while
preserving all demonstration workflows. A valid pair reveals customer sign-in; no banking request is made until submission. It does not
enable financial operations or prove backend connectivity.

To change environments, edit `.env` or the exported variables and recreate the container using the
same image:

```sh
docker compose up -d --no-build --force-recreate web
```

`docker compose restart` alone does **not** reload Compose environment changes. Reload browser tabs
after recreating the container; each page session retains its validated configuration. Nginx serves
`/runtime-config.json` as JSON with `Cache-Control: no-store`, never an SPA fallback. Existing static
asset caching, SPA routing, and `/health` remain unchanged.

For two harmless runtime checks, reuse the built image with
`https://localhost:8443/fineract-provider/api/v1/self` and
`https://localhost:9443/fineract-provider/api/v1/self`, recreating between values, and inspect
`curl -i http://localhost:8080/runtime-config.json`. No backend request is needed. Verify both the
JSON and `no-store` response header. The image ID should stay the same. With plain Docker, pass the
same settings using `docker run -e SELF_SERVICE_BASE_URL=... -e SELF_SERVICE_TENANT_ID=...`.

For another static host (including `npm run preview`), generate the resource after the build with
exported environment settings and Node 24:

```sh
npm run build
node --experimental-strip-types docker/generate-runtime-config.mjs dist/runtime-config.json
npm run preview
```

That host must explicitly serve `/runtime-config.json` with `Cache-Control: no-store` and no SPA
fallback. Vite preview itself does not provide the production Nginx cache contract. Deployments without
this resource still support the in-memory demo, but API configuration is unavailable.

### Supported frontend deployment path

This application supports hosting at the origin root (`/` or `/index.html`) only. Its UI already uses
root-relative image and font URLs; a full subpath deployment such as `/online-banking/` is not supported.
The configuration loader enforces this contract **before fetching**: any other page pathname rejects
API configuration with a clear diagnostic rather than reading an unrelated application's root resource.
The demo may still render through an SPA fallback, but API configuration remains unavailable there.
Root query strings and fragment navigation do not change the supported pathname.

Configuration is fetched only from the fixed `/runtime-config.json` path; redirects are rejected.
Neither an environment variable nor a page query parameter can select an arbitrary configuration URL.
An API endpoint's reverse-proxy prefix remains independently configurable in `SELF_SERVICE_BASE_URL`.
Supporting a frontend subpath would require reviewing the UI assets and hosting rules together; changing
only Vite's `base` option or moving the built HTML is insufficient.

### Typed consumers and troubleshooting

Bootstrap preloads configuration without delaying the demo. `getSelfServiceConfig()` in
`src/lib/self-service.ts` returns a shared promise for a validated, immutable `{ baseUrl, tenantId }`.
Consumers of this runtime module must await it before sending any request. `selfServiceUrl("clients/123/accounts")` waits for
that promise and constructs `.../v1/self/clients/123/accounts`; it performs no HTTP request. Pass only
relative resource paths, with no leading slash or API prefix; add query parameters with `URL.searchParams`.
The customer authentication client awaits the same configuration and uses its URL builder and tenant.

JSON `null` explicitly disables API configuration. A missing resource, non-success HTTP response,
redirect, malformed JSON, validation failure, unsupported page path, or five-second load timeout also
rejects the configuration promise with an explicit error. Bootstrap logs a `[Self Service]`
warning in the developer console, and the demo remains available. No configured URL is treated as proof
of connectivity, and failures never fall back to the frontend origin or a shared banking instance.

If startup fails, check that either both values are empty (demo only) or both are valid, including the
full `/v1/self` path, HTTPS, and tenant syntax. Container errors do not echo supplied values. For browser
load errors, inspect `/runtime-config.json` and its response headers, then
reload after fixing and recreating the container. A valid configuration does not verify reachability:
direct browser authentication requires a trusted backend TLS certificate and backend CORS permitting
the frontend origin and required headers. No server-side proxy is provided; the provisional session
limitations below must be reviewed before production use.

### Configuration tests

```sh
npm run test:config
```

The Node 24 suite tests validation, path construction, loading order and failures, public allowlisting,
Vite development responses, standalone demo-only generation, invalid/partial settings, and generation
with two endpoint values. Root and subpath checks verify that unsupported deployments cannot fetch a
different root application's configuration. These isolated checks do not prove same-image container
behavior. Nginx cache/routing assertions inspect its configuration; they do not replace a running-container
check. The Playwright suite also checks successful and failed runtime
configuration while preserving demo access and performing no banking requests.

## Customer sign-in (MX-452)

With valid MX-453 runtime settings, **Online banking** opens a username/password form for the
configured Self Service Plugin. It sends `POST <baseUrl>/authentication` with JSON
`{ "username": "…", "password": "…" }` and `Fineract-Platform-TenantId`. It sends no cookie or
Authorization header on login, rejects redirects and times out requests after 15 seconds.
Use a dedicated synthetic tenant/customer when testing; do not use shared banking credentials.

Success requires `authenticated: true`, valid server identity, roles, permissions and an access key,
and explicit false values for `shouldRenewPassword` and `isTwoFactorAuthenticationRequired`.
An HTTP 200 response alone cannot grant access. Pending/disabled responses, required additional
authentication and password renewal stay outside the customer boundary with localized feedback.
No frontend verification code can complete these backend-required steps.

A successful login opens a customer view showing the **server-returned username** and the MX-469
savings application entry point. It never mounts the demo dashboard or illustrative landing balances.
Balance/transaction enquiries, transfers, receipts and profile editing remain unavailable here.
Permissions and linked clients are parsed from the server, not inferred from demo state; savings
operations require independent server authorization.

The password is cleared from form state on submission and is never saved by the app. The access key
is held only in a closure for authenticated requests and access-token logout; it is not exposed to React, the legacy step-up
client, browser storage or cookies. Refresh tokens are discarded and there is no automatic refresh.
Browser password managers remain under the customer's control (`current-password` autocomplete).
The session disappears on reload, expires after 10 minutes of inactivity, and has an absolute local
15-minute lifetime. These local limits do not change the backend token lifetime or detect remote
revocation before a future authenticated API request.

Logout and local expiry immediately clear the authenticated UI and attempt
`POST <baseUrl>/authentication/logout` with `Authorization: Basic <base64EncodedAuthenticationKey>`
and the original configured tenant. The key is already base64 of the plugin's raw access token;
it is neither a Bearer token nor base64 of username/password. Logout feedback distinguishes local
clearing from an acknowledged server access-token logout. The inspected backend deletes only the
presented access token; **refresh-token revocation is incomplete**. Reload/tab closure, aborted
requests and lost responses cannot guarantee server revocation. Notifications remain backend-owned.

This is an **explicitly provisional direct browser session**, not an HttpOnly session. The static
Vite/Nginx deployment has no trusted backend-for-frontend or session-cookie infrastructure. Memory
storage does not protect against XSS. Production requires a session/threat-model review, trusted TLS
on frontend and backend, reviewed CORS for the frontend origin and `Content-Type`, `Authorization`,
`Fineract-Platform-TenantId` headers, and backend policy/revocation fixes. Never enable credential or
response-body logging in deployment proxies. Live backend verification and the session/security
review remain required before production use.

**Explore demo with fictional data** is a separate explicit choice. Without valid configuration the
original standalone demo login remains available with a configuration-unavailable notice. Real
login failure never falls back to demo. Customer tokens are never installed in `src/lib/selfservice/`;
that older client and its step-up adapter remain separate from this login and its permissions.

## Included

- Responsive Spanish-language landing page with sticky navigation, custom architectural imagery, regulatory information, interactive products, account preview, benefits, illustrative stories, costs and conditions, FAQ, contact tools, and footer.
- File-based internationalization for Mexican Spanish and English, including interface copy, accessibility labels, validation messages, dates, currency, CSV headers, and demo receipts. Mexican Spanish is the default and the selected locale persists locally.
- Motion entrances, scroll reveals, product transitions, subtle ambient animation, and hover/tap interactions. System reduced-motion preferences are respected.
- Accessible native dialogs, keyboard focus handling, form labels, visible focus indicators, and inline validation.
- Demo login, local two-step onboarding, and an explicitly simulated recovery flow.
- Personal and business account balances, balance privacy toggle, transaction search and filters, CSV export, and beneficiary management.
- Transfers between own accounts and to demo beneficiaries, amount limits, balance validation, review, step-up verification (one-time code), and downloadable demo receipts.
- Business transfers remain pending until a simulated second signature approves them. Rejected operations do not change balances.
- Investment and loan calculators with clearly disclosed hypothetical rates, not advertised product terms.
- All data stays in memory. No analytics, tracking cookies, real financial operations, or form submissions are configured.

## Demo Access

| Segment  | Client Number | Password   |
| -------- | ------------- | ---------- |
| Personas | `344988355`   | `Mifos#26` |
| Empresas | `880214001`   | `Mifos#26` |

Demo verification code: `123456` (shown on screen in demo mode, never accepted by a real backend). Business second-signature code: `654321`.

These values are intentionally public test fixtures, not real credentials or security controls. The session expires after ten minutes without pointer or keyboard activity. Closing the demo discards its data.

## Step-up verification (OTP)

Sensitive actions, today the transfer confirmation, ask for a one-time code (MX-488). The server issues, sends and checks the code; the browser never decides.

- `src/components/StepUpPanel.tsx`: accessible inline panel (autofill with `one-time-code`, numeric keypad, attempts left, code lifetime timer, resend cooldown, lock-out message, English and Spanish).
- `src/lib/stepup/`: `useStepUpChallenge` (the flow as a state machine) over a `StepUpApi`. Two adapters: `httpStepUpApi` (the real `/v1/self/stepup/*` endpoints of [selfservice-plugin](https://github.com/openMF/selfservice-plugin)) and `demoStepUpApi` (in memory, same rules, public code `123456`).
- `src/lib/selfservice/`: typed client of the self-service API (`config`, `session`, `http`, `auth`, `stepup`). The session lives in memory only, never in `localStorage`. The `Authorization` header is built in a single function (`authorizationHeader` in `session.ts`) so the planned OIDC move touches one place.

The real adapter is used only when a backend is configured **and** a session exists; otherwise the demo adapter is used. MX-452 customer authentication uses a separate memory-only capability and never sets this legacy session. The demo screens therefore remain isolated from real customer authentication; the backend step-up adapter is covered by mocked-`fetch` tests here and the plugin's own integration tests.

The one-time token returned after a correct code is single use, valid for a short time and only for the exact transfer it was issued for. Hand it to the API in the `X-Step-Up-Token` header of that one request.

### Existing step-up client build-time configuration

The current `src/lib/selfservice/config.ts` client reads the following build-time settings. Set them
explicitly in a local `.env.local` or system environment if exercising that client. `.env.example`
documents the separate MX-453 runtime loader described above. `VITE_*` values are public: put no secrets
in them. Without `VITE_SELF_SERVICE_BASE_URL` the step-up selector uses the in-memory demo. Runtime
configuration does not establish a backend login session or switch this adapter by itself.

| Variable                       | Meaning                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `VITE_SELF_SERVICE_BASE_URL`   | Origin of the Fineract instance, no trailing slash         |
| `VITE_SELF_SERVICE_ENDPOINT`   | Path before `/v1/self` (default `/fineract-provider/api`)   |
| `VITE_SELF_SERVICE_TENANT_ID`  | `Fineract-Platform-TenantId` header (default `default`)    |

The backend must allow this origin in CORS and accept the `X-Step-Up-Token` header.

## Security activity history (MX-491)

The "Actividad de seguridad" / "Security activity" view of the banking dialog lists the sign-ins and the sensitive actions of the user, newest first, so that unauthorised use can be spotted (US-E12-05). Each entry shows what happened, when and from where (**masked** IP address); a failed or unusual one (failed sign-in, new device, locked verification) is marked in words and with an icon, not only with a colour. Filter chips (all, sign-ins, transfers and beneficiaries, account, verifications) and "show more" page through the list.

- `src/components/ActivityFeed.tsx`: the accessible screen (live status, `aria-pressed` filters, alert with retry, es-MX and en-US).
- `src/lib/activity/`: `ActivityApi` with two adapters, like step-up: `httpActivityApi` (the real `GET /v1/self/activity` of [selfservice-plugin](https://github.com/openMF/selfservice-plugin)) and `demoActivityApi` (in memory). `describe.ts` turns an entry into text; `useActivityFeed` loads page by page.
- `src/lib/selfservice/activity.ts`: the typed client. It cannot ask for another user: the server only returns the history of the logged-in user.

The real adapter is used only when a backend is configured **and** a session exists; otherwise the demo adapter is used, which says so on screen. The demo history starts with a few older entries (clearly fake, with the documentation-range address `192.0.x.x`) and then follows what the demo user does: sign-in, transfers (a business transfer only after the second signature), beneficiaries and the verification code. Like step-up, the real path is covered by mocked-`fetch` tests here and by the plugin's own integration tests. MX-452 customer login uses a separate session and does not enable this adapter in the demo screens.

The server never sends a full IP address, a password, a code or a full account number; the screen shows only what it receives.

## Verification

Unit and component tests run without a server:

- `npm run typecheck`
- `npm test` (Vitest: authentication client, customer components, legacy API clients, step-up flow, activity history and panels)
- `npm run test:config` (runtime configuration and startup generation)

Browser tests need a development server on port 5173 (`npm run dev`), then:

- `npx playwright install --with-deps chromium`
- `npx playwright test`
- `node tests/visual-check.mjs`
- `npm audit`

The browser suite uses synthetic intercepted responses for real-login success/failures, loading, configuration, demo isolation, storage, logout, reload and expiry; these are not live integration tests. It also covers navigation, calculators, FAQs, stories, login validation, transfers, verification failures (attempts left, lock-out, resend cooldown, expiry, accessibility, English), the security activity view (what the user did, filters, business approvals, accessibility, English), balance conservation for own-account transfers, exports, second-signature approval, beneficiary validation, local onboarding, contact preparation, focus restoration, and mobile layout.

Visual and accessibility reports are written to `artifacts/`. Automated checks supplement, rather than replace, manual accessibility testing.

## Production Integration Boundary

This frontend builds for production hosting, but it is **not an operational banking channel**. Configured customer authentication can call Self Service, but live integration has not been verified. Real financial operations remain unavailable. The browser-side demo password and the demo verification code must never authorize real operations; with a backend, the code is checked by the server only.

Before launching live banking, implement a reviewed backend integration with reviewed session management (including secure HttpOnly sessions where appropriate), authorization, genuine MFA, rate limiting, audit logging, idempotent ledger operations, and independently authenticated business approvers. Handle account balances and transaction validation exclusively on the server. Never place banking API secrets in Vite environment variables exposed to the browser.

Verify the contracted products, current commissions, rates, GAT/CAT disclosures, regulatory statements, privacy notices, legal rights to brand assets, and operational support arrangements with MIFOS. Complete penetration testing, accessibility review, and financial/compliance approval. Replace illustrative stories with consented, verified testimonials if real endorsements are required.

Contact preparation only creates a local message to copy. It never claims an inquiry was sent. Real inquiries and contracts are directed to MIFOS's verified website and phone number.

## Files

- `src/App.tsx`: landing sections and experience orchestration.
- `src/components/Access.tsx`: demo access, onboarding, contact, and disclosures.
- `src/components/CustomerAccess.tsx`, `src/lib/authentication/`: customer sign-in, provisional memory session and isolated authenticated view.
- `src/components/Banking.tsx`: functional in-memory banking demo.
- `src/components/ProductPreview.tsx`: interactive preview and calculators.
- `src/components/ui.tsx`: brand, reveal, and accessible dialog primitives.
- `src/components/StepUpPanel.tsx`, `src/lib/stepup/`, `src/lib/selfservice/`: step-up verification and the self-service client (see above).
- `src/lib/demo.ts`: typed fixtures, centavo arithmetic, exports, and receipts.
- `src/i18n/`: typed locale provider and matching `es-MX.json` / `en-US.json` message catalogs.
- `src/styles/`: responsive design and component styling.
- `tests/`: end-to-end, visual, and accessibility checks.

## Assets and Attribution

Custom AI-generated campaign imagery is stored locally in `public/images/`. The Mexico City hero is an illustrative architectural composition, not a photograph of an actual MIFOS location. Manrope is self-hosted and distributed under the SIL Open Font License in `public/fonts/OFL.txt`. Icons use Lucide. Motion uses Motion for React.

The implementation is original to this project; the linked openMF repository was consulted for demo workflows and test credentials. No claim is made that this demo modifies or deploys the upstream repository, or that it is an officially authorized banking service.

## Savings applications (MX-469)

After a backend-verified customer login, choose **Apply for a savings account**. Select an
explicitly authorized client (when several are linked), then a product from the Self Service
savings template. Review the institution's defaults, supply the application date if it has no
backend default, and submit once. The confirmation reads the new account's actual number and
status through the authorized savings detail endpoint; unavailable details remain explicit.

This workflow uses MX-453 runtime configuration and the MX-452 memory-only session. Demo login
cannot enable it. An uncertain POST is locked against resubmission for the current session;
**Check accounts without resubmitting** performs only authorized reads. Contact the institution
before applying again if an outcome remains uncertain, including after reloading or signing in
again. No server idempotency contract was established for this endpoint.

Products requiring extra datatables or charge schedules absent from the template direct customers
to their institution. No required product charges are silently removed. Live verification against
an isolated synthetic tenant remains blocked; mocked tests do not prove account creation.
