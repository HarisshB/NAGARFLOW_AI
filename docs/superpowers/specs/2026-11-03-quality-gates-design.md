# Quality Gates: CI, Stable Tests, Linting and an Honest Sign-in Card

Improvements outside the roadmap stories. Branch `chore/quality-gates`, cut from `main` at `a68f3f9`. No epic or story changes status.

## Goal

Every push is checked automatically, the checks give the same answer every time, and the sign-in page no longer shows invented city figures.

## Decisions

- **One workflow, parallel jobs:** a failure names the part that broke, and a run takes about as long as its slowest job.
- **Both databases:** the backend suite runs once on in-memory SQLite and once on PostgreSQL 16, the version both compose files pin.
- **Versions match the containers:** Python 3.12 (`backend/Dockerfile`) and Node 20 (`frontend/Dockerfile`).
- **No container build in CI:** the Dockerfiles rarely change, and building both images adds about 5 minutes per push. The deployment guide's local check still covers them.
- **Standard lint rules, no reformatting:** linters catch mistakes; they do not restyle the code base. Whatever they flag is fixed in this change so CI starts green.
- **Root cause, not longer timeouts:** the flaky tests are diagnosed before anything is changed. A timeout is raised only if the diagnosis shows slowness is the whole cause, and the reason is written beside it.
- **Nothing is pushed** until the owner says so. The workflow first runs on GitHub on that push.

## 1. CI

**File:** `.github/workflows/ci.yml`, named `CI`.

**Triggers:** `push` to any branch and `pull_request`. Concurrent runs for the same branch cancel the older one.

**Permissions:** `contents: read` only. No secrets are used.

| Job | Steps |
|---|---|
| `backend-lint` | Python 3.12, install `requirements-dev.txt`, `ruff check .` in `backend/` |
| `backend-sqlite` | Python 3.12 with pip cache, install `requirements.txt` and `requirements-dev.txt`, `python -m pytest -q` in `backend/` |
| `backend-postgres` | Same as `backend-sqlite`, with a `postgres:16` service (database `nagarflow_test`, health-checked with `pg_isready`) and `TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nagarflow_test` |
| `frontend` | Node 20 with npm cache, `npm ci`, `npm run lint`, `npm test`, `npm run build` in `frontend/` |

- The service password is a throwaway value inside the CI runner, not a credential.
- The database name ends in `_test`, which the conftest guard requires.
- The three real-data test files skip themselves because the Trichy dataset is not in the repository. That is expected.
- The `postgres_only` tests run only in `backend-postgres`.

## 2. Flaky frontend tests

**Symptom:** on three separate occasions a full `npm test` run had list tests time out (depots, scenarios and storage points, seen together), and the next run passed with no change in between. It happened most often on the first run after switching branches, and once under CPU load.

**Method:** superpowers systematic debugging. Reproduce first: run the suite repeatedly, and under deliberate CPU load, until it fails, and record which assertion times out and after how long. The fix follows the cause found. It is not chosen in advance.

**Starting hypothesis, to test, not assume:** these tests render the whole `App` and wait for the list with `findBy*`, whose default limit is 1 second. That can expire on a busy machine before the mocked data appears.

**Done when:**
- The cause is named in the commit message.
- 10 full runs in a row pass, 5 of them under CPU load.
- No test's assertions are weakened.

## 3. Linting

**Backend**
- `ruff` added to `backend/requirements-dev.txt` with an upper bound, as the other entries have.
- `backend/ruff.toml`: target Python 3.12, line length 100, rules `E`, `F`, `W`, `I` (pycodestyle, pyflakes, warnings, import order) and `B` (bugbear). The `.venv` folder is excluded.
- A rule may be turned off for a path only with a comment saying why.

**Frontend**
- ESLint 9 with a flat config in `frontend/eslint.config.js`: `@eslint/js` recommended, `eslint-plugin-react` recommended with the JSX runtime, and `eslint-plugin-react-hooks` recommended. Browser globals for `src/`, and Vitest globals for `src/test/`.
- New script: `"lint": "eslint ."`. `dist/` is ignored.

**Findings:** each finding is fixed as the smallest change that satisfies the rule. A finding that turns out to be a real bug (a missing hook dependency that leaves a value stale, an unused result that should have been used) gets a failing test first, then the fix.

**README:** the testing section names `ruff check .` and `npm run lint`.

## 4. Sign-in card

The card in `frontend/src/components/AuthShell.jsx` currently shows a "CITY OVERVIEW" with a pulsing "LIVE" badge and three invented figures: 128 "Ideas in motion", 24 "Neighborhoods" and 4.8k "Active neighbors". The new card describes the prototype instead:

- **Label and title:** "ABOUT THIS PROTOTYPE" and "Secondary waste routing, Trichy".
- **Badge:** "SYNTHETIC DATA" in place of "LIVE", with no pulsing dot.
- **Figures**, each a true fact about the prototype: **2** "Vehicles per scenario", **1** "Processing facility", **10** "Test scenarios".
- **Footer:** "Greedy and OR-Tools, compared on road distance." The avatar stack is removed.
- The headline, eyebrow, layout and colours stay. The `.live-indicator` style is renamed `.data-tag`.
- The card stays `aria-hidden`, because it is decorative.

**Tests** in a new `frontend/src/test/authShell.test.jsx`:
- The sign-in page contains no "LIVE" text and no invented figures (128, 4.8k).
- The sign-in page shows "SYNTHETIC DATA".

## Testing

- Backend: the whole suite passes on SQLite and on PostgreSQL. Locally the PostgreSQL run uses `docker compose up -d db` and a `nagarflow_test` database.
- Frontend: lint is clean, tests pass 10 runs in a row, and the build succeeds.
- `ruff check .` is clean.
- The workflow file is checked by running each job's commands locally. Its real first run is on GitHub after the owner approves a push.

## Out of scope

- The remaining stories: E00-S04, E00-S05 and E08-S03, plus the sign-offs on the assumption-based stories.
- The road file checksum, the five Stage 4 leftovers, splitting large files and the accessibility pass.
- Branch protection rules on GitHub. These are repository settings for the owner.
- Code formatting with ruff format or Prettier.

## Done when

- The four CI jobs' commands pass locally.
- Both linters are clean.
- The flaky tests' cause is fixed and 10 runs in a row pass.
- The sign-in card shows only true prototype facts.
- The branch is committed and awaits the owner's decision to push.
