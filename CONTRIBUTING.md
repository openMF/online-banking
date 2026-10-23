# Contributing to Online Banking (Mifos Banca Web)

Thank you for your interest in contributing. This project is a demonstration prototype of an electronic banking channel for Mifos. Contributions that improve reliability, accessibility, internationalization, documentation, or developer experience are especially welcome.

## Code of conduct

Be respectful and constructive. Assume good intent. Harassment or discriminatory behavior is not acceptable.

## How to contribute

1. **Fork** the repository and create a branch from `master` (or the default branch).
2. **Install** dependencies and verify the app runs locally (see [README.md](./README.md)).
3. Make focused changes with clear commit messages.
4. Ensure typecheck, lint, and tests pass when applicable.
5. Open a **Pull Request** describing the problem, the solution, and how to test it.

### Branch naming

Prefer short, descriptive names:

- `feat/i18n-locale-switcher`
- `fix/session-timeout-toast`
- `docs/contributing-docker`
- `chore/dockerfile-nginx`

### Commit messages

Use the imperative mood and a concise subject (optional scope):

```
feat(i18n): add en-US and es-MX locale files
fix(session): correct inactivity toast message
docs: add CONTRIBUTING and Docker setup
```

## Development setup

```bash
git clone https://github.com/openMF/online-banking.git
cd online-banking
npm install
npm run dev
```

Open the URL printed by the dev server (typically `http://localhost:8080`).

Demo credentials and activation details are documented in [README.md](./README.md).

### Useful scripts

| Command            | Purpose                          |
|--------------------|----------------------------------|
| `npm run dev`      | Local development server         |
| `npm run build`    | Production build                 |
| `npm run typecheck`| TypeScript check                 |
| `npm run lint`     | ESLint                           |
| `npm test`         | Unit tests                       |
| `npm run format`   | Prettier write                   |

## Internationalization (i18n)

User-facing strings live in:

- `src/i18n/locales/es-MX.json` (default)
- `src/i18n/locales/en-US.json`

When adding or changing copy:

1. The key is the Spanish text itself. Add it to **both** locale files: `es-MX.json` maps it to itself, `en-US.json` to the English text.
2. Text inside `<LocalizedTree>` (including `aria-label`, `placeholder`, `title` and `alt`) is translated on render, so writing the Spanish string in JSX is enough.
3. For text built in code, use `translate("…")`. For values such as names, use a placeholder: `translateWith("Eliminar a {name}", { name })`, with the same `{name}` in the English text.
4. Store Spanish keys in data (for example a transaction detail) and translate them when rendering, so they follow a language switch.
5. Form validation messages (`required`, `minLength`, `pattern`, `type="email"`, `min`/`max`) are translated automatically by `I18nProvider`; add a message to `validationMessage` only for a new kind of rule.

`npm test` checks that both locale files have the same keys and placeholders. The Playwright i18n audit (`tests/i18n.spec.ts`) fails when a main screen shows text in the other language.

Do not leave new hardcoded user-facing Spanish or English strings in the UI without a matching key.

## Docker

See [Dockerfile](./Dockerfile), [nginx.conf](./nginx.conf), and [docker-compose.yml](./docker-compose.yml).

```bash
# Build and run with Docker Compose (Nginx serves the built app)
docker compose up --build -d

# App available at http://localhost:8080
```

## Pull request checklist

- [ ] Change is limited in scope and described in the PR body
- [ ] New or changed UI strings are in both `es-MX` and `en-US` locale files
- [ ] `npm run typecheck` and `npm run lint` succeed (when relevant)
- [ ] Manual smoke test of affected flows (login, transfer, locale switch, session timeout)
- [ ] README / CONTRIBUTING updated if behavior or setup changed
- [ ] No secrets, real customer data, or production credentials committed

## Reporting issues

Open an issue with:

- Steps to reproduce
- Expected vs actual behavior
- Browser / Node version if relevant
- Screenshots or console errors when useful

## License

Contributions are accepted under the same license terms as the repository (see LICENSE / project headers where present). By submitting a contribution you agree that it may be distributed under those terms.
