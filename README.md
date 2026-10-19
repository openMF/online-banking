# MIFOS Digital Banking Experience

A complete Spanish-language React and TypeScript experience inspired by MIFOS's identity and the personal/business journeys in [Mifos Online Banking](https://github.com/openMF/online-banking).

## Run

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

The entry point is `src/App.tsx`. The supplied Vite configuration produces a static production build in `dist/`. Deploy the entire directory, including its images and fonts, at the site root.

## Included

- Responsive Spanish-language landing page with sticky navigation, custom architectural imagery, regulatory information, interactive products, account preview, benefits, illustrative stories, costs and conditions, FAQ, contact tools, and footer.
- File-based internationalization for Mexican Spanish and English, including interface copy, accessibility labels, validation messages, dates, currency, CSV headers, and demo receipts. Mexican Spanish is the default and the selected locale persists locally.
- Motion entrances, scroll reveals, product transitions, subtle ambient animation, and hover/tap interactions. System reduced-motion preferences are respected.
- Accessible native dialogs, keyboard focus handling, form labels, visible focus indicators, and inline validation.
- Demo login, local two-step onboarding, and an explicitly simulated recovery flow.
- Personal and business account balances, balance privacy toggle, transaction search and filters, CSV export, and beneficiary management.
- Transfers between own accounts and to demo beneficiaries, amount limits, balance validation, review, verification, and downloadable demo receipts.
- Business transfers remain pending until a simulated second signature approves them. Rejected operations do not change balances.
- Investment and loan calculators with clearly disclosed hypothetical rates, not advertised product terms.
- All data stays in memory. No analytics, tracking cookies, real financial operations, or form submissions are configured.

## Demo Access

| Segment  | Client Number | Password   |
| -------- | ------------- | ---------- |
| Personas | `344988355`   | `Mifos#26` |
| Empresas | `880214001`   | `Mifos#26` |

First verification code: `123456`. Business second-signature code: `654321`.

These values are intentionally public test fixtures, not real credentials or security controls. The session expires after ten minutes without pointer or keyboard activity. Closing the demo discards its data.

## Verification

Run a development server on port 5173, then:

- `npx tsc --noEmit`
- `npx playwright install --with-deps chromium`
- `npx playwright test`
- `node tests/visual-check.mjs`
- `npm audit`

The browser suite covers navigation, calculators, FAQs, stories, login validation, transfers, verification failures, balance conservation for own-account transfers, exports, second-signature approval, beneficiary validation, local onboarding, contact preparation, focus restoration, and mobile layout.

Visual and accessibility reports are written to `artifacts/`. Automated checks supplement, rather than replace, manual accessibility testing.

## Production Integration Boundary

This frontend builds for production hosting, but it is **not an operational banking channel**. No MIFOS or Fineract backend is connected. The browser-side demo password and verification checks must never authorize real operations.

Before launching live banking, implement a reviewed backend integration with server-side identity verification, authentication, HttpOnly secure sessions, authorization, genuine MFA, rate limiting, audit logging, idempotent ledger operations, and independently authenticated business approvers. Handle account balances and transaction validation exclusively on the server. Never place banking API secrets in Vite environment variables exposed to the browser.

Verify the contracted products, current commissions, rates, GAT/CAT disclosures, regulatory statements, privacy notices, legal rights to brand assets, and operational support arrangements with MIFOS. Complete penetration testing, accessibility review, and financial/compliance approval. Replace illustrative stories with consented, verified testimonials if real endorsements are required.

Contact preparation only creates a local message to copy. It never claims an inquiry was sent. Real inquiries and contracts are directed to MIFOS's verified website and phone number.

## Files

- `src/App.tsx`: landing sections and experience orchestration.
- `src/components/Access.tsx`: access, onboarding, contact, and disclosures.
- `src/components/Banking.tsx`: functional in-memory banking demo.
- `src/components/ProductPreview.tsx`: interactive preview and calculators.
- `src/components/ui.tsx`: brand, reveal, and accessible dialog primitives.
- `src/lib/demo.ts`: typed fixtures, centavo arithmetic, exports, and receipts.
- `src/i18n/`: typed locale provider and matching `es-MX.json` / `en-US.json` message catalogs.
- `src/styles/`: responsive design and component styling.
- `tests/`: end-to-end, visual, and accessibility checks.

## Assets and Attribution

Custom AI-generated campaign imagery is stored locally in `public/images/`. The Mexico City hero is an illustrative architectural composition, not a photograph of an actual MIFOS location. Manrope is self-hosted and distributed under the SIL Open Font License in `public/fonts/OFL.txt`. Icons use Lucide. Motion uses Motion for React.

The implementation is original to this project; the linked openMF repository was consulted for demo workflows and test credentials. No claim is made that this demo modifies or deploys the upstream repository, or that it is an officially authorized banking service.
