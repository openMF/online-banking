---
name: online-banking-docker-compose
description: Install, run, verify, stop or troubleshoot Mifos X Online Banking (the openMF/online-banking web app) on this computer with Docker Compose, using the docker-compose.yml at this repository's root. Use when the user asks to install, set up, deploy, start, run, open, stop, uninstall or fix Online Banking locally or with Docker.
compatibility: Needs git, Docker with the Compose plugin (docker compose), curl, a POSIX shell (sh), internet access for the first build, and port 8080 free. No local Node.js needed. Local demo only, not for production.
---

# Install Mifos X Online Banking with Docker Compose

Online Banking is a React web app. `docker-compose.yml` has one service, `web`: it builds the app
with Node in a first image stage, then serves it with Nginx on `http://localhost:8080`. Without
any settings it runs as a **standalone demo** with fictional data kept in the browser's memory, so
there is no database, backend or volume to set up.

Run every command yourself and read its output; don't hand the steps to the user as instructions.
Explain each step in one plain sentence as you go, for someone who has not used Docker before.
Report success only after every check in step 5 passes.

## 1. Preflight

```bash
docker info --format '{{.ServerVersion}}'   # the Docker daemon is running
docker compose version                      # the Compose v2 plugin is installed
```

If `docker info` fails, Docker isn't running: ask the user to start Docker Desktop (or Colima,
OrbStack, the Linux service) and stop here. If `docker compose version` fails, the Compose plugin
is missing; point the user to https://docs.docker.com/compose/install/ and stop here.

## 2. Get the code

If the current directory has no `docker-compose.yml` whose service is `web` with
`image: online-banking:latest`, clone the repository and work inside it:

```bash
git clone https://github.com/openMF/online-banking.git
cd online-banking
```

If an `online-banking` directory already exists, use it; don't delete or overwrite it.

Then check what is already there:

```bash
docker compose ps -a
```

If the user asked to connect a Self Service backend, continue with step 3 even when the app is
already there: step 4 then recreates the container with the new settings. Otherwise, if it lists
`online-banking` as running and healthy, the app is already installed: go to step 5. If it is
stopped, `docker compose up -d` starts it again, then go to step 5.

Port 8080 must be free: `curl -s -m 2 -o /dev/null http://127.0.0.1:8080/` exits with code 7
(connection refused) only when nothing listens there. If another program has the port, tell the
user which one (`lsof -nP -iTCP:8080 -sTCP:LISTEN` on macOS/Linux) and ask what to do. Don't stop
that program yourself.

## 3. Configure (usually nothing to do)

The standalone demo needs no configuration and no `.env` file. Skip this step unless the user
asks to connect a real Self Service backend (a Fineract server with the Self Service plugin).
In that case, if `.env` already exists, don't overwrite it: show it to the user and change it only
with their agreement. Otherwise create it from the example:

```bash
cp -n .env.example .env   # -n: never overwrite an existing .env
```

Then ask the user for both values; never invent them:

- `SELF_SERVICE_BASE_URL`: the full API root ending in `/v1/self`, using `https://`. Example:
  `https://localhost:8443/fineract-provider/api/v1/self`.
- `SELF_SERVICE_TENANT_ID`: the tenant, for example `default`.

Set both or neither. These values are visible to every browser; never put a password, API key or
token in `.env`. Starting this backend is not part of this skill.

Variables exported in your shell override `.env`. Check the values Compose will pass to the
container:

```bash
docker compose config | grep SELF_SERVICE_
```

If they differ from the pair the user gave, show both to the user and resolve it with them (for
example `unset SELF_SERVICE_BASE_URL SELF_SERVICE_TENANT_ID`) before step 4.

## 4. Build and start

```bash
docker compose up -d --build
```

The first build downloads the Node and Nginx images and the npm packages, so it takes from under a
minute to a few minutes, depending on the internet connection. Later builds reuse Docker's cache. Give the command a timeout of at least
10 minutes. It returns once the container has started.

## 5. Verify (all checks must pass)

```bash
sh .agents/skills/online-banking-docker-compose/scripts/verify-install.sh
```

The script waits up to 2 minutes for the container to report `healthy`, then checks:

1. The `web` container is running and its Docker health check reports `healthy`.
2. `GET /health` answers `ok`.
3. `GET /` serves the app's page (HTTP 200, HTML with the `MIFOS` title).
4. `GET /runtime-config.json` answers HTTP 200 with JSON: `null` in demo mode, or the configured
   backend settings.

It prints one PASS or FAIL line per check and exits 0 only if all pass (1 if a check fails, 2 if
the stack isn't running or curl is missing). Show the user the PASS/FAIL lines as a table. If a
check fails, report the failure and the log lines it prints instead of a success message, then use
the troubleshooting table below.

If the user asked for a backend, check 4 must show their `baseUrl` and `tenantId` exactly. If it
shows other values or `null`, report that instead of success.

## 6. Tell the user how to use it

- Open the address the verification script prints (**http://localhost:8080** by default) in a
  browser. The page is in Spanish by default; the language
  switch in the header changes it to English.
- Click **Banca en línea** (_Online banking_). With a backend configured, this opens the customer
  login of that server; click **Explorar demostración con datos ficticios** (_Explore demo with
  fictional data_) first to use the demo. Sign in with a fictional demo account:

  | Segment             | Client number | Password   |
  | ------------------- | ------------- | ---------- |
  | Personas (personal) | `344988355`   | `Mifos#26` |
  | Empresas (business) | `880214001`   | `Mifos#26` |

  The demo verification code is `123456`; the business second-signature code is `654321`. These
  are public test values from the README, not real credentials.

- In the demo, everything stays in the browser's memory: closing the tab resets it, and no real
  money moves.
- With a backend configured, the customer login signs in to that server, and transfers there are
  real operations on it. Tell the user to connect only a test tenant with synthetic data.

## Troubleshooting

| Symptom                                                                                         | Cause and fix                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the Docker daemon`                                                           | Docker isn't running. Ask the user to start it, then retry                                                                                                                                                                                                          |
| `npm ci` fails during the build, or `failed to resolve source metadata` / timeouts              | Network problem while downloading. Run `docker compose up -d --build` again once; report the error if it fails twice                                                                                                                                                |
| `operation not permitted` on a path under `~/.docker` (for example `~/.docker/buildx/activity`) | Your own sandbox blocks Docker's build state, not Docker itself. Don't report success. Tell the user that the agent's sandbox must allow writes to `~/.docker` (in Codex: `--add-dir ~/.docker`) or that they should approve the command to run outside the sandbox |
| `port is already allocated` / `address already in use`                                          | Another program uses port 8080. Tell the user which one (see step 2). If they want another port, change `"8080:80"` in `docker-compose.yml` only with their permission                                                                                              |
| `The container name "/online-banking" is already in use`                                        | Another copy of this repository (or an older run) already created the container. Show `docker ps -a --filter name=online-banking`, and ask the user before removing it with `docker rm -f online-banking`                                                           |
| Container `Restarting` or `Exited (1)`, log shows `[Self Service] ...`                          | The `.env` settings are invalid (for example an `http://` URL or only one of the two values). Show `docker compose logs --tail=20 web`, fix `.env` with the user, then `docker compose up -d --force-recreate web`                                                  |
| Container `Exited (127)`, log shows `not found` for a `.sh` file                                | A shell script has Windows (CRLF) line endings, for example from a ZIP download or an editor. Check with `file docker/40-self-service-config.sh`. Get the code with `git clone` instead: `.gitattributes` keeps these files LF                                      |
| Health stays `starting` or becomes `unhealthy`                                                  | Show `docker compose logs --tail=50 web` and the output of `docker inspect --format '{{json .State.Health}}' online-banking`                                                                                                                                        |
| The browser shows an old version after `git pull`                                               | The image wasn't rebuilt. Run `docker compose up -d --build`                                                                                                                                                                                                        |
| `.env` changes have no effect                                                                   | `docker compose restart` doesn't reload settings. Run `docker compose up -d --force-recreate web` and reload the browser tab                                                                                                                                        |

## Stop or uninstall

```bash
docker compose stop                 # stop the app; `docker compose up -d` starts it again
docker compose down                 # remove the container and its network
docker compose down --rmi all       # also remove the built online-banking image
```

This stack has no Docker volumes, so `down` loses no saved data. Still ask the user before running
`down --rmi all`, before `docker rm -f`, and before deleting any directory or `.env` file. Check
the result with `docker compose ps -a`, which lists nothing after `down`.

## Rules

- Change the system only through the commands above. Don't edit `docker-compose.yml`, `Dockerfile`
  or the source unless the user asks.
- Don't run `docker system prune`, `docker volume prune`, `docker compose down -v`, or commands that
  stop or remove containers that don't belong to this Compose project. The one exception is an old
  `online-banking` container blocking the name (see Troubleshooting), and only after the user
  approves.
- The demo is for local use only: the port is published on all network interfaces, and the demo
  logins are public. Tell the user not to expose it on a network they don't trust.
