# MX-473 implementation and review report

## A. Implementation summary

Authenticated customer home now offers **Apply for a loan**. The form reads real product options, intersects them with the authorized client's template options, and loads selected-product defaults and constraints. It supports principal, term/unit, repayment count/interval/frequency, interest settings, payment strategy, purpose, submission/disbursement/first repayment dates, and configured loan charges with specified dates where applicable.

Customers review before creating or correcting an application. The UI displays authorized read-back details and actual status, separately labels resource ID and assigned account number, supports pending-only corrections, and deliberately confirms withdrawal in a native modal dialog. No approval, disbursement, repayment, guarantor management, or optional charge management was added.

Complex products requiring borrower-cycle variations, floating rates, interest recalculation, multiple disbursements, datatables, rates, or unsupported charge schedules fail closed with a translated explanation. This is an explicit product-coverage limitation, not fabricated support. Core continues to enforce product/business-date/state constraints. No backend files changed.

## B. Git baseline and dependencies

- Worktree: `/Users/anvaykharb/Desktop/online-banking/online-banking-mx-473`.
- Branch: `feat/mx-473-loan-application`.
- Parent: `aec0a8154b7a46d73ba45453c233ae0527b44889`, fetched upstream `openMF/online-banking` master.
- This base already includes MX-453 configuration, MX-452 customer authentication, savings applications, security/step-up, request resilience, and merged own-account transfers (PR #52). No stacked/unmerged dependency is required.
- Upstream open-PR API returned only PR #50 at inspection. Prior feature checkouts were clean and preserved. Backend checkout remains on `develop` at `3a104d5`; fetched backend source was inspected without changing that checkout.
- The user subsequently authorized a local commit of this implementation. No push, merge, rebase, reset, branch deletion, PR creation, container startup, or database mutation was performed.
- The implementation is committed locally at the user’s subsequent request. The feature branch has not been pushed; compare against parent `aec0a81` for the reviewable change set.

## C. Verified contracts and source evidence

Backend inspection used plugin develop commit **f14d1912ac986d30bf152ed0992f4cf5f2f12b3b**. Its POM declares plugin `1.16.0-SNAPSHOT`, Java 25, Spring Boot 4.1.1 and Fineract `0.0.1628-bc1c598`. The older local checkout's POM declares Java 21 / Fineract 1.15.0-SNAPSHOT; it must not be confused with the fetched source. Core DTO/status/withdrawal validators were also checked against the plugin's pinned **bc1c598** core revision. These are source-verified contracts, not proof of a running deployment.

All paths below are relative to the configured `/v1/self` base. The existing CustomerSession supplies its pinned API base, tenant header and memory-only Basic access token.

| Operation | Verified HTTP contract / DTO | Source |
| --- | --- | --- |
| Product list | `GET /loanproducts`; array of core `LoanProductData`; requires read permission `LOANPRODUCT` | Plugin `products/api/SelfLoanProductsApiResource.java:223–240` |
| Product constraints | `GET /loanproducts/{productId}`; core `LoanProductData`, including limits and `allowAttributeOverrides` | Same file, lines 243–264 |
| Client/product template | `GET /loans/template?templateType=individual&clientId={authorizedId}[&productId={id}]`; core `LoanAccountData`, including `productOptions`, client metadata, currency, term/interest options and defaults | Plugin `loanaccount/api/SelfLoansApiResource.java:259–313`; Swagger lines 811–845; core `LoanAccountData.java:78–175,370–448` |
| Create | `POST /loans`; `PostSelfLoansRequest` / core loan command. Mandatory `clientId, productId, loanType=individual, principal, loanTermFrequency, loanTermFrequencyType, numberOfRepayments, repaymentEvery, repaymentFrequencyType, interestRatePerPeriod, amortizationType, interestType, interestCalculationPeriodType, transactionProcessingStrategyCode, expectedDisbursementDate, submittedOnDate`; dates use `yyyy-MM-dd`, locale `en`. Optional purpose/start date and configured charges are included only when applicable. | Resource lines 316–402; Swagger 849–955; `loanaccount/data/SelfLoansDataValidator.java:103–147`; core `LoanApplicationValidator.java:254` onward |
| Details | `GET /loans/{loanId}`; authorized core `LoanAccountData`, with `status`, `timeline`, actual principal/product/term/account number | Resource lines 98–140; Swagger lines 35 onward |
| Pending correction | `PUT /loans/{loanId}`; `PutSelfLoansLoanIdRequest`. This UI sends reviewed mutable financial/date/purpose fields; omits `clientId`, `productId`, `loanType`, `submittedOnDate` and charges. Existing charges remain untouched. | Resource lines 404–464; Swagger 977–1024; validator lines 149–191 |
| Withdrawal | `POST /loans/{loanId}?command=withdrawnByApplicant`; `{ withdrawnOnDate, dateFormat: "yyyy-MM-dd", locale: "en" }`. `note` is optional and unused. Command result must identify the expected resource, then details must confirm withdrawn status. | Resource lines 466–509; Swagger 1059–1073; core `LoanApplicationTransitionValidator.java:177–238` |
| Discovery/recovery | `GET /clients/{authorizedId}/accounts`, `loanAccounts` summaries, then authorized loan-detail reads. Discovery alone never proves a timed-out create succeeded. | Plugin `client/api/SelfClientsApiResource.java:223–269` |

Plugin source prefix: `src/main/java/org/apache/fineract/selfservice/`.

Direct source references:

- [Current loan resource](https://github.com/openMF/selfservice-plugin/blob/f14d1912ac986d30bf152ed0992f4cf5f2f12b3b/src/main/java/org/apache/fineract/selfservice/loanaccount/api/SelfLoansApiResource.java#L259).
- [Loan Swagger DTOs](https://github.com/openMF/selfservice-plugin/blob/f14d1912ac986d30bf152ed0992f4cf5f2f12b3b/src/main/java/org/apache/fineract/selfservice/loanaccount/api/SelfLoansApiResourceSwagger.java#L849).
- [Product resource](https://github.com/openMF/selfservice-plugin/blob/f14d1912ac986d30bf152ed0992f4cf5f2f12b3b/src/main/java/org/apache/fineract/selfservice/products/api/SelfLoanProductsApiResource.java#L223).
- [Ownership guard](https://github.com/openMF/selfservice-plugin/blob/f14d1912ac986d30bf152ed0992f4cf5f2f12b3b/src/main/java/org/apache/fineract/selfservice/security/guard/SelfServiceOwnershipGuardImpl.java#L126).
- [Plugin resource tests](https://github.com/openMF/selfservice-plugin/blob/f14d1912ac986d30bf152ed0992f4cf5f2f12b3b/src/test/java/org/apache/fineract/selfservice/loanaccount/api/SelfLoansApiResourceTest.java#L218).
- [Pinned core withdrawal validation](https://github.com/apache/fineract/blob/bc1c598/fineract-loan/src/main/java/org/apache/fineract/portfolio/loanaccount/serialization/LoanApplicationTransitionValidator.java#L177).
- [Pinned core statuses](https://github.com/apache/fineract/blob/bc1c598/fineract-core/src/main/java/org/apache/fineract/portfolio/loanaccount/domain/LoanStatus.java#L29).

`SelfLoansApiResource` delegates ownership to `SelfServiceOwnershipGuard` (lines 512–519). The guard checks authenticated user mappings and tenant-routed services before reads/commands. Loan creation validates the selected client; correction validates both loan ownership and any supplied client (this UI never supplies a replacement client).

Core withdrawal requires submitted/pending state, a date on/after submission, and a date no later than the backend business date. It is distinct from deletion/cancellation. Pending status is ID 100, code `loanStatusType.submitted.and.pending.approval`, `pendingApproval=true`. Withdrawn status is ID 400, code **`loanStatusType.withdrawn.by.client`** (display value “Withdrawn by applicant”). The frontend rejects contradictory metadata.

The fetched `StepUpAction` enum contains transfer/password/authenticator/signature actions, no loan mutation action. No extra loan challenge or browser demo verification is invented. Backend permission/MFA denials are respected.

## D. Jira compatibility

[MX-473](https://mifosforge.jira.com/browse/MX-473) describes DELETE withdrawal. The current self-service **loan application** resource has no DELETE route. Its withdrawal route is the command-based POST above; the DELETE present in the latest resource belongs to **guarantors**, outside this story. The implementation follows supported POST withdrawal and preserves the banking audit trail. Jira's withdrawal-method criterion needs correction.

## E. Files changed

| File | Purpose |
| --- | --- |
| `src/lib/loans/client.ts` | Typed template/loan parsing, validation, authorized discovery, exact mutation DTOs, state checks and session-lifetime write locks |
| `src/lib/loans/messages.ts` | Safe errors and known status labels |
| `src/components/LoanApplication.tsx` | Product/client selection, review, actual details, correction, withdrawal modal, loading/error/recovery/focus behavior |
| `src/components/CustomerAccess.tsx` | Authenticated entry point and per-login client lifetime; demo unchanged |
| `src/styles/access.css` | Responsive loan form/detail/modal styling |
| `src/i18n/locales/{es-MX,en-US}.json` | Spanish/English messages |
| `src/lib/loans/client.test.ts` | DTO, tenant/auth, ownership, limits, malformed answers, state races and mutation locks |
| `src/components/LoanApplication.test.tsx` | Form defaults, client/product changes, review, correction, modal cancellation, expiry and approval race |
| `tests/fixtures/loans.ts` | Synthetic core-shaped test data |
| `tests/loan-application.spec.ts` | Mocked integration browser workflows and failure/security/accessibility checks |
| `docs/MX-473-implementation.md` | This report, contract evidence and review instructions |
| `docs/MX-473-PR.md` | Draft PR description |

## F. Functional walkthrough

1. With valid runtime configuration, sign in using the institution's real customer login. Choose **Apply for a loan**. A demo login never mounts this workflow.
2. Select an authorized client when multiple mappings exist. Pick a product from eligible backend options. Product changes reload defaults. Complete required fields, including any dates without backend defaults.
3. Choose **Review loan application**, inspect the terms/charges, then explicitly confirm. Product terms are refreshed before dispatch; changed terms require another review.
4. The client reads the returned resource. The detail view shows actual status and identifiers, including a separate account number only when returned. Pending approval is never equated with approval or disbursement.
5. Open an existing application from **My applications and loans**, or use the submitted detail. **Correct application** appears only for confirmed pending status. Review and confirm the permitted changes; status and template are checked again immediately before PUT.
6. **Withdraw application** opens a modal explaining the audit trail. Cancel/Escape makes no request. Enter the withdrawal date and confirm once. The result is read back and must actually be withdrawn. Pending-only actions disappear afterward.
7. After any uncertain write, use **Check applications** for reads only or contact the institution. No mutation is automatically retried, and closing/reopening does not reset a lock. One successful creation is retained per login; submitting additional new applications requires a new login after checking existing applications.

## G. Verification

See final recorded results below. Browser fixtures are **mocked integration tests**, not evidence of live Fineract creation/correction/withdrawal.

Node 26.8.1 caused broad pre-existing jsdom failures (`window.localStorage` undefined). The installed **Node 24.21.0** runs the suite successfully. No repository test-environment workaround or unrelated fix was added. For the commands below use `PATH=/opt/homebrew/opt/node@24/bin:$PATH`.

- `npm ci`: PASS; 203 packages installed, zero audit vulnerabilities.
- `npm test` (Node 24): **PASS, 671 tests in 23 files** (including 40 new loan API/component tests). Existing authentication, savings, configuration-adjacent and security suites pass.
- `npm run test:config`: PASS, 67 tests.
- `npx tsc --noEmit` / `npm run typecheck`: **PASS**.
- `npm run build`: **PASS** (2,456 modules; single-file production output). Existing Manrope font-file warnings do not prevent building.
- `npx playwright test tests/loan-application.spec.ts`: **PASS, 20 mocked integration tests**. These also pass inside the full dev suite and against the final production build.
- `npx playwright test`: **FAIL overall: 220 PASS, 3 baseline FAIL (223 total, 9.2 minutes)**. All 20 loan browser tests pass. See exact baseline reproduction below.
- `node tests/visual-check.mjs`: **PASS** on dev and production preview; all 18 printed checks pass, including runtime errors, accessibility, mobile and missing translations.
- `npm audit`: PASS, zero vulnerabilities.
- `git diff --check`: **PASS**. The implementation change set comprises 4 modified files and 9 new files, all limited to MX-473; a local commit was subsequently authorized by the user.
- Desktop Spanish and 390px English screenshots inspected; no overflow and no Axe violations in the loan workflow.
- Production-preview verification: **PASS**. `npm run preview -- --host 127.0.0.1 --port 5174 --strictPort`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 npx playwright test tests/loan-application.spec.ts --output artifacts/loan-production-tests` (**20/20**) and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 node tests/visual-check.mjs` (**PASS**).
- Live backend integration: **BLOCKED**. Docker is not installed/available (`docker: command not found`), no compatible disposable environment/tenant/synthetic customer was identified, and no plugin or database was started. Host Java is 25.0.4.1. Registered live endpoints, mappings and approval rules therefore remain unverified.

### Baseline failures independently reproduced

The following failures reproduce against an untouched `git archive HEAD` of parent `aec0a81`, served separately from `/tmp/mx473-baseline` with the same installed dependencies:

1. `tests/authenticator.spec.ts:240` — authenticator phone accessibility: color contrast.
2. `tests/banking.spec.ts:821` — security activity phone accessibility: color contrast.
3. `tests/customer-transfer.spec.ts:521` — keyboard-only transfer: ArrowDown does not commit the native destination selection in this browser environment, leaving it unselected.

Reproduction command (with the parent archive served at 5175):

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test \
  tests/authenticator.spec.ts tests/banking.spec.ts tests/customer-transfer.spec.ts \
  --grep 'the steps have no accessibility violations and fit a phone|has no accessibility violations and fits a phone|the whole flow works with the keyboard alone' \
  --output artifacts/baseline-tests
```

Result: the **same 3 failures**, plus 1 matching passing test. No unrelated fix was made. The previously reported footer translation failure did **not** reproduce in the current full run: both main-screen language audits pass.

Verification logs are retained locally under ignored `artifacts/mx473-verification/`. Browser failure traces/screenshots are in `test-results/` and `artifacts/baseline-tests/`; loan screenshots are `artifacts/loan-desktop-es.png` and `artifacts/loan-mobile-en.png`. Generated artifacts are not part of the proposed source diff.

## H. Acceptance matrix

| Criterion | Evidence | Result |
| --- | --- | --- |
| Product-specific template and client options | Template/product sources, authorized client selection, client eligibility intersection, defaults/constraints and tests | PARTIAL: supported ordinary products pass mocked tests; complex product configurations explicitly blocked |
| POST creates submitted/pending application | Exact create DTO tests, authorized ID read-back, actual status displayed (including unexpected approved status) | PARTIAL: source + mocked tests pass; live creation BLOCKED |
| PUT corrects pending application | Preflight status/ownership/template checks, restricted DTO, race/lock tests, browser correction | PARTIAL: source + mocked tests pass; live correction BLOCKED |
| Withdrawal | POST command/date/locale, modal cancellation, pending-only rules, actual withdrawn status read-back | PARTIAL: supported API + mocked tests pass; Jira DELETE inaccurate; live withdrawal BLOCKED |

## I. Security assessment and independent review

- Existing CustomerSession pins tenant/base URL and retains its access key in memory. No new credential store, token props, logging, fallback demo credential, or second authentication client was introduced.
- Client choices come exclusively from the authenticated backend identity. Templates must match that client/product. Details must match the requested resource and an authorized client; unauthorized/malformed data is cleared. Backend ownership remains authoritative.
- Per-login client locks prevent concurrent mutations and persist across form closure. POST/PUT never opt into read retry. Lost transport responses, malformed 2xx acknowledgments, failed post-write readbacks and unclassified failures remain uncertain. A read of pending data never clears an uncertain update lock.
- Structured command validation failures, ownership/permission rejection, expired authentication and state conflict are handled separately; arbitrary 4xx responses are not assumed to mean no write occurred. Backend traces/values are never rendered as errors.
- Templates are cloned and revalidated before dispatch. The user cannot modify cached constraints via the returned template. Correction omits client/product reassignment and charge replacement. Advanced unsupported requirements are blocked.
- The independent diff review checked endpoint annotations, the pinned core withdrawn code, ownership and status parsing, duplicate dispatch, error/readback paths, template refreshes, demo isolation and scope. It found and fixed incorrect draft withdrawn-status naming, a render-effect race clearing the editor, readback failures incorrectly unlocking writes, missing initial eligibility filtering, stale pending actions after concurrent approval, and preserving the created client/product binding during later recovery reads. Regression tests cover these paths.
- Financial amounts and business dates remain backend-authoritative. No repayment schedule, balance, approval, or successful mutation is fabricated.

## J. Remaining blockers

Live backend validation and deployment-specific permissions/product coverage remain unverified. Advanced templates are intentionally unsupported as described above. Uncertain writes require read-only reconciliation and potentially institution assistance; there is no backend idempotency key to justify resending. Locks are memory-only and cannot survive a reload/new login, so the warning explicitly tells customers to inspect applications before further submission.

## K. PR readiness

**Ready with verification blockers**: live backend acceptance is unverified, advanced product configurations are explicitly unsupported, and the full browser gate contains three independently reproduced baseline failures. Reviewable frontend implementation; live backend acceptance remains blocked. No PR was created.

## L. Draft PR description

See [MX-473-PR.md](./MX-473-PR.md).

## M. Expected GitHub links

These are URL patterns only. **No remote feature branch was pushed or verified to exist.**

- [Expected comparison](https://github.com/openMF/online-banking/compare/master...AnvayKharb:online-banking:feat/mx-473-loan-application).
- [Expected PR creation](https://github.com/openMF/online-banking/compare/master...AnvayKharb:online-banking:feat/mx-473-loan-application?expand=1).

The base is upstream master, so no stacked comparison is necessary. Refresh the base through the maintainer's normal process before eventual publication if upstream advances; this task did not rewrite history.
