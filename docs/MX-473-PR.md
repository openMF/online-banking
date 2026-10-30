# feat: implement self-service loan applications (MX-473)

Authenticated customers can select a real loan product and authorized client, review product-specific terms, submit an application, and read its actual status. Confirmed pending applications can be corrected or withdrawn. The feature reuses CustomerSession, runtime configuration, tenant selection and error/expiry handling; the existing demo remains separate.

- Read products, eligible client templates and supplementary product limits. Apply backend defaults and validate amounts, dates and permitted selections.
- Require explicit review before POST/PUT and deliberate confirmation before withdrawal. Recheck current state and product terms before changing an application.
- Verify resource IDs and read actual loan details after commands. Distinguish application ID from account number and pending approval from approval/disbursement.
- Prevent concurrent dispatch and retain uncertain-write locks across closing/reopening. Never automatically retry POST/PUT or infer success from account discovery.
- Add Spanish/English messages, keyboard/focus behavior, responsive UI, API/component tests and contract-based mocked integration browser tests.

Jira: https://mifosforge.jira.com/browse/MX-473

**Withdrawal API discrepancy:** Jira says DELETE. Current SelfLoansApiResource supports `POST /v1/self/loans/{loanId}?command=withdrawnByApplicant`, with `withdrawnOnDate`, date format and locale. Its actual withdrawn status code is `loanStatusType.withdrawn.by.client`. No loan-application DELETE route was added and no backend source was modified.

Validation (Node 24):

- Unit/component tests: **671 passed**; runtime configuration tests: **67 passed**.
- Loan mocked integration browser tests: **20 passed** on dev and production builds, including Spanish desktop and English mobile, exact POST/PUT/withdrawal bodies, unauthorized access, uncertain writes, duplicate prevention, modal cancellation and accessibility.
- Full Playwright suite: **220 passed, 3 failed**. All three failures reproduce on untouched parent `aec0a81`: two existing contrast checks and the existing transfer keyboard test. No unrelated fixes were included.
- Typecheck, production build, dev/production visual checks and `git diff --check`: **PASS**. `npm audit`: **0 vulnerabilities**.

Validation results and exact source references: [implementation report](./MX-473-implementation.md#g-verification).

Live Fineract verification is **BLOCKED**: no safe compatible disposable backend is available; no containers or databases were started or changed. Browser tests use synthetic API responses and do not prove live loan creation. Advanced templates requiring borrower-cycle variations, floating rates, recalculation, multi-disbursement, datatables/rates or unsupported charge schedules are explicitly blocked pending broader form support.

Base: upstream master `aec0a8154b7a46d73ba45453c233ae0527b44889`; required authentication/configuration/savings/resilience dependencies are already merged. No unmerged feature stack is required.
