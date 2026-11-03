# Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check every push automatically with stable tests and two linters, and replace the invented figures on the sign-in card with true prototype facts.

**Architecture:** One GitHub Actions workflow with four parallel jobs runs the same commands developers run locally. The flaky frontend tests are fixed at their cause first, so CI gives one answer every time. ruff and ESLint get config files in their own folders and a clean baseline.

**Tech Stack:** GitHub Actions, Python 3.12, pytest, ruff, PostgreSQL 16, Node 20, Vitest, ESLint 9, React 18.

**Spec:** `docs/superpowers/specs/2026-11-03-quality-gates-design.md`

## Global Constraints

- Branch `chore/quality-gates`. Nothing is pushed until the owner says so.
- CI versions: Python 3.12, Node 20, `postgres:16`.
- Workflow permissions `contents: read`. No secrets.
- Postgres test database name ends in `_test`: `nagarflow_test`.
- ruff: target `py312`, line length 100, rules `E`, `F`, `W`, `I`, `B`; `.venv` excluded. A per-path ignore needs a comment saying why.
- ESLint 9 flat config: `@eslint/js` recommended, `eslint-plugin-react` recommended with the JSX runtime, `eslint-plugin-react-hooks` recommended. `dist/` ignored.
- No reformatting with ruff format or Prettier. Fixes are the smallest change that satisfies a rule.
- No test's assertions are weakened anywhere in this plan.
- Never commit `.env`, `.claude/` or the untracked `docs/` folders. Stage files by name.
- Synthetic labelling: the UI shows no invented municipal figures.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A hook-dependency lint fix that causes a render loop or a refetch on every render.** A reasonable person expects every page to behave exactly as before. Task 4 Step 4 pins it: each `react-hooks/exhaustive-deps` change is listed in the commit, and the full suite plus a browser pass over each touched page must show no repeated API calls.
2. **ruff's import-order or bugbear fix changes behaviour.** Examples: an "unused" import that registers models with SQLAlchemy, or a mutable default that was shared on purpose. A reasonable person expects the API to behave the same. Task 3 Step 4 pins it: imports with side effects get `# noqa: F401` and a reason, not removal, and both backend suites pass.
3. **`npm ci` fails in CI because `package-lock.json` drifted from `package.json`** after the ESLint packages were added. A reasonable person expects a clean install to work. Task 4 Step 6 pins it: delete `node_modules` and run `npm ci` before committing.
4. **The PostgreSQL job starts the tests before the database accepts connections.** A reasonable person expects no random connection failures. Task 5 pins it with a `pg_isready` health check in the service options.
5. **The flaky-test fix holds on a fast laptop but not on a slower, shared CI runner.** Task 1 Step 6 pins it: 5 of the 10 verification runs are made under CPU load.

---

## File Structure

| File | Task | Responsibility |
|---|---|---|
| `frontend/src/test/*.test.jsx` (those the diagnosis names) | 1 | The flaky tests, fixed at their cause |
| `frontend/src/components/AuthShell.jsx` | 2 | Sign-in card copy |
| `frontend/src/styles.css` | 2 | `.live-indicator` renamed `.data-tag` |
| `frontend/src/test/authShell.test.jsx` (new) | 2 | Card shows only true facts |
| `backend/ruff.toml` (new), `backend/requirements-dev.txt` | 3 | Backend lint rules |
| `frontend/eslint.config.js` (new), `frontend/package.json`, `frontend/package-lock.json` | 4 | Frontend lint rules and script |
| `README.md` | 3, 4 | Lint commands in the testing section |
| `.github/workflows/ci.yml` (new) | 5 | The four CI jobs |

---

### Task 1: Fix the flaky frontend tests at their cause

**Files:**
- Modify: whichever test files, or shared test setup in `frontend/src/test/setup.js`, the diagnosis names
- Create (scratch, never committed): a loop script in the session scratchpad

**Interfaces:**
- Consumes: nothing.
- Produces: a frontend suite that passes 10 runs in a row. Tasks 2, 4 and 5 rely on it.

This task follows superpowers:systematic-debugging. The fix is not chosen in advance.

- [ ] **Step 1: Write a loop script that reproduces the failure**

The script runs `npm test --prefix frontend` N times, saves each run's output to `run-<i>.log`, and prints pass or fail per run. With a `--load` flag it first starts one `node -e "for(;;);"` busy process per CPU core and kills them when it finishes.

- [ ] **Step 2: Reproduce**

Run: the loop script with 10 runs, then 10 runs with `--load`.
Expected: at least one failing run. Record which tests fail, the assertion, the query that timed out and the elapsed time. If 20 runs never fail, also run once straight after `git switch main && git switch chore/quality-gates`, which is when the failure was seen most.

- [ ] **Step 3: Find the cause**

Compare the failing tests with similar list tests that never fail: what they render, what they await, the mocks they reset, and timers. Test the spec's starting hypothesis directly, that `findBy*` times out after its 1-second default while the full `App` renders. To do that, time how long the list takes to appear in a passing run under load. Write the cause in one sentence in the ledger.

- [ ] **Step 4: Write the change that removes the cause**

The change depends on what Step 3 finds. If the cause is only render time under load, raise the wait for those queries with `asyncUtilTimeout` in `frontend/src/test/setup.js`, via `configure` from `@testing-library/react`, with a comment giving the measured time. If the cause is an ordering, mock or leak bug, fix that and leave the timeouts alone.

- [ ] **Step 5: Confirm the test still catches a real break**

Temporarily make the depots list render nothing, and run its test.
Expected: FAIL. Revert.

- [ ] **Step 6: Verify stability**

Run: the loop script with 5 runs, then 5 with `--load`.
Expected: 10 of 10 pass, every run `Tests  157 passed`.

- [ ] **Step 7: Commit**

```bash
git add <the files changed in Step 4>
git commit -m "test: <cause in a few words>"
```

The commit body names the cause and the measured timings.

---

### Task 2: Show only true prototype facts on the sign-in card

**Files:**
- Modify: `frontend/src/components/AuthShell.jsx`, `frontend/src/styles.css:51-52`
- Test: `frontend/src/test/authShell.test.jsx`

**Interfaces:**
- Consumes: the stable suite from Task 1.
- Produces: `.data-tag` CSS class, replacing `.live-indicator`.

- [ ] **Step 1: Write the failing tests**

Render `<MemoryRouter><AuthShell><p>form</p></AuthShell></MemoryRouter>`. `AuthShell` wraps the sign-in, forgot-password and reset-password pages, so this covers all three.

```jsx
test("the sign-in card shows no live badge or invented city figures", () => {
  const { container } = renderShell();
  expect(container.textContent).not.toMatch(/\bLIVE\b/);
  for (const figure of ["128", "4.8k", "Ideas in motion", "Active neighbors"]) {
    expect(container.textContent).not.toContain(figure);
  }
});

test("the sign-in card labels itself synthetic and states the prototype's facts", () => {
  renderShell();
  expect(screen.getByText("SYNTHETIC DATA")).toBeInTheDocument();
  expect(screen.getByText("ABOUT THIS PROTOTYPE")).toBeInTheDocument();
  expect(screen.getByText("Vehicles per scenario")).toBeInTheDocument();
  expect(screen.getByText("Processing facility")).toBeInTheDocument();
  expect(screen.getByText("Test scenarios")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test --prefix frontend -- authShell`
Expected: both FAIL. The first finds "LIVE", and the second cannot find "SYNTHETIC DATA".

- [ ] **Step 3: Change the card in `AuthShell.jsx`**

Use exactly this copy from the spec:
- Mini label "ABOUT THIS PROTOTYPE", title "Secondary waste routing, Trichy".
- `<span className="data-tag">SYNTHETIC DATA</span>`, with no `<i />` dot.
- Metrics: **2** "Vehicles per scenario", **1** "Processing facility", **10** "Test scenarios". Keep the three icon spans.
- Footer: "Greedy and OR-Tools, compared on road distance." Remove the avatar stack and keep the spark.
- The headline, eyebrow, `aria-hidden` and layout stay.

In `styles.css`, rename `.live-indicator` to `.data-tag` and delete the `.live-indicator i` rule. Remove the `.avatar-stack` rules only if nothing else uses them.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test --prefix frontend`
Expected: `Tests  159 passed`.

- [ ] **Step 5: Check it in the browser**

Open `http://localhost:5175/login`. The card shows the new copy with no overflow, on desktop and at 375 px wide.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AuthShell.jsx frontend/src/styles.css frontend/src/test/authShell.test.jsx
git commit -m "fix: show true prototype facts on the sign-in card, not invented city figures"
```

---

### Task 3: Backend linting with ruff

**Files:**
- Create: `backend/ruff.toml`
- Modify: `backend/requirements-dev.txt`, `README.md` (testing section near line 80), and the backend files ruff flags

**Interfaces:**
- Consumes: nothing.
- Produces: `ruff check .`, run from `backend/`, exits 0. Task 5 runs this exact command.

- [ ] **Step 1: Add the dependency and config**

In `requirements-dev.txt`, add `ruff>=0.8,<1.0`. In `ruff.toml`: `target-version = "py312"`, `line-length = 100`, `extend-exclude = [".venv"]`, and `[lint] select = ["E", "F", "W", "I", "B"]`. Install with `backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt`.

- [ ] **Step 2: Run it to see the baseline**

Run: `cd backend && .venv/Scripts/python.exe -m ruff check . --statistics`
Expected: a non-zero count of findings. Record the count per rule in the ledger.

- [ ] **Step 3: Apply the safe automatic fixes**

Run: `.venv/Scripts/python.exe -m ruff check . --fix`. Never use `--unsafe-fixes`.
Then read the full `git diff` and revert any fix that removes an import used for its side effect (see Review Focus 2).

- [ ] **Step 4: Fix the remaining findings by hand**

For each finding, make the smallest change. When a finding is a real bug (bugbear `B006` mutable default, `B008` call in a default, `B904` lost exception cause, `F841` result that should have been used), first write a failing test in the matching `backend/tests/` file, then fix it. A finding that must stay gets a `# noqa: <code>` on that line with the reason, or a `per-file-ignores` entry with a comment.

- [ ] **Step 5: Verify**

Run: `.venv/Scripts/python.exe -m ruff check .`
Expected: `All checks passed!`
Run: `.venv/Scripts/python.exe -m pytest -q`
Expected: the same pass count as before this task (record it in Step 2), plus any new bug tests, with only the dataset and PostgreSQL skips.

- [ ] **Step 6: README**

In the testing section, add the line `py -m ruff check .`, run from `backend/`, next to `py -m pytest`.

- [ ] **Step 7: Commit**

```bash
git add backend/ruff.toml backend/requirements-dev.txt README.md <files ruff changed>
git commit -m "chore: lint the backend with ruff"
```

Real bug fixes from Step 4 go in their own `fix:` commit before this one.

---

### Task 4: Frontend linting with ESLint

**Files:**
- Create: `frontend/eslint.config.js`
- Modify: `frontend/package.json`, `frontend/package-lock.json`, `README.md` (near line 104), and the frontend files ESLint flags

**Interfaces:**
- Consumes: the card from Task 2, which is linted like any other file.
- Produces: `npm run lint`, run from `frontend/`, exits 0. Task 5 runs this exact command.

- [ ] **Step 1: Install**

Run: `npm install --prefix frontend --save-dev eslint@^9 @eslint/js@^9 eslint-plugin-react eslint-plugin-react-hooks globals`

- [ ] **Step 2: Write `eslint.config.js` and the script**

The flat config has:
- `ignores: ["dist/"]`
- `js.configs.recommended`
- `react.configs.flat.recommended` and `react.configs.flat["jsx-runtime"]`, with `settings.react.version = "detect"`
- `reactHooks.configs["recommended-latest"]`, or `recommended` if the installed version has no flat `-latest` preset
- `languageOptions.globals` set to `globals.browser` for `src/**`, plus `globals.vitest` for `src/test/**`, and `globals.node` for `*.config.js`

Turn off `react/prop-types` with a comment: the project does not use PropTypes and has no TypeScript.
In `package.json`, add `"lint": "eslint ."`.

- [ ] **Step 3: Run it to see the baseline**

Run: `npm run lint --prefix frontend`
Expected: findings. Record the count per rule in the ledger.

- [ ] **Step 4: Fix the findings**

Use the smallest change for each. For every `react-hooks/exhaustive-deps` finding, decide whether adding the dependency would re-run the effect on each render. If it would, keep the effect stable (a memoised callback, or moving the function inside the effect) and do not add a disable comment. When a finding is a real bug, such as a stale value, write a failing test in the page's test file first. List each hook change in the commit body.

- [ ] **Step 5: Verify**

Run: `npm run lint --prefix frontend`
Expected: no output, exit 0.
Run: `npm test --prefix frontend`
Expected: `Tests  159 passed`, or more with any new bug tests.
Browser: for each page whose hooks changed, open it at `http://localhost:5175`. The network panel must show each API call once per action, with no repeats.

- [ ] **Step 6: Check a clean install**

Run: `rm -rf frontend/node_modules && npm ci --prefix frontend && npm run build --prefix frontend`
Expected: the install and the build both succeed.

- [ ] **Step 7: README and commit**

Add `npm run lint` next to `npm test` in the README.

```bash
git add frontend/eslint.config.js frontend/package.json frontend/package-lock.json README.md <files ESLint changed>
git commit -m "chore: lint the frontend with ESLint"
```

---

### Task 5: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `ruff check .` (Task 3), `npm run lint` (Task 4), and the stable suite (Task 1).
- Produces: workflow `CI` with jobs `backend-lint`, `backend-sqlite`, `backend-postgres` and `frontend`.

- [ ] **Step 1: Write the workflow**

- `on: [push, pull_request]`
- `permissions: contents: read`
- `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`
- Every job runs on `ubuntu-latest` and starts with `actions/checkout@v4`.
- The backend jobs use `actions/setup-python@v5` with `python-version: "3.12"`, `cache: pip` and `cache-dependency-path: backend/requirements*.txt`. Each job sets `working-directory: backend` and runs `pip install -r requirements.txt -r requirements-dev.txt`.
  - `backend-lint` runs `ruff check .`.
  - `backend-sqlite` runs `python -m pytest -q`.
  - `backend-postgres` runs `python -m pytest -q` with:
    - The service `postgres: image postgres:16`, env `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: postgres` and `POSTGRES_DB: nagarflow_test`.
    - Port `5432:5432`.
    - Options `--health-cmd "pg_isready -U postgres -d nagarflow_test" --health-interval 5s --health-timeout 5s --health-retries 10`.
    - Job env `TEST_DATABASE_URL: postgresql+psycopg://postgres:postgres@localhost:5432/nagarflow_test`.
- `frontend` uses `actions/setup-node@v4` with `node-version: 20`, `cache: npm` and `cache-dependency-path: frontend/package-lock.json`, `working-directory: frontend`, and runs `npm ci`, `npm run lint`, `npm test` and `npm run build`.

- [ ] **Step 2: Check the YAML parses**

Run: `backend/.venv/Scripts/python.exe -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs']))"`. Install `pyyaml` in the venv first if it is missing. Do not add it to the requirements.
Expected: `['backend-lint', 'backend-postgres', 'backend-sqlite', 'frontend']`.

- [ ] **Step 3: Run the PostgreSQL job's tests locally**

Run `docker compose up -d db`, then `docker exec nagarflow_ai-db-1 createdb -U nagarflow nagarflow_test`. If the database already exists, that is fine. Then run the suite with `TEST_DATABASE_URL=postgresql+psycopg://nagarflow:<POSTGRES_PASSWORD from .env>@127.0.0.1:5433/nagarflow_test`. Read the password from `.env` in the shell, and never print or commit it.
Expected: every test passes, the `postgres_only` tests run, and only the dataset tests skip.

- [ ] **Step 4: Run the other jobs' commands locally**

- `ruff check .` in `backend/`: exit 0.
- `python -m pytest -q` in `backend/`: passes.
- `npm ci && npm run lint && npm test && npm run build` in `frontend/`: passes.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run lint, backend tests on SQLite and PostgreSQL, and the frontend on every push"
```

The workflow's first real run happens on GitHub after the owner approves a push. Report that it has not run there yet.
