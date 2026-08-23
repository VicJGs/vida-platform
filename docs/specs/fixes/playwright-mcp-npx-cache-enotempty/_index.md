# FIX (diagnosis) — Playwright MCP fails to connect (`-32000`) — npx cache ENOTEMPTY
Type: bug (ENVIRONMENT / pre-flight — diagnosis + resolution only; NO code build, NO §XXVI double-gate per §XXIV J-1 / victor-triage).
Status: RESOLVED (2026-08-21, session 2026-08-21-mod-notes-3)
Source-repo: /Users/victor/Documents/CODE/vida-platform

## 1. Defect + root cause (cited)
**Symptom.** `/mcp` reports `Failed to reconnect to playwright: -32000`; the `playwright` MCP server never comes up.

**Reproduction.** Spawning the server's exact command exits **code 190**:
```
$ npx -y @playwright/mcp@latest
npm error code ENOTEMPTY
npm error syscall rename
npm error path /Users/victor/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
npm error dest /Users/victor/.npm/_npx/9833c18b2d85bc59/node_modules/.playwright-hF4YN4z3
npm error errno -66
npm error ENOTEMPTY: directory not empty, rename 'playwright' -> '.playwright-hF4YN4z3'
```

**Root cause (one sentence).** The error is caused by **stale `.playwright-*` temp directories left in the npx cache
by a prior interrupted install colliding with npm's atomic-rename target** — NOT by the Playwright MCP server, the
`playwright` package, or a missing browser.

**Confirmed by ground truth** (`ls /Users/victor/.npm/_npx/9833c18b2d85bc59/node_modules/`): the cache dir (which is
the `@playwright/mcp@latest` npx hash — verified via its `package.json`) contained BOTH the live `playwright` /
`playwright-core` dirs (Aug 17) AND stale `.playwright-hF4YN4z3` / `.playwright-core-0FJHMpEb` temp dirs dated **Jul 13**.
npm's install renames `playwright` → `.playwright-hF4YN4z3`, but that target already existed and was non-empty → `ENOTEMPTY`.

## 2. Facets
- **Symptom vs cause:** client sees a JSON-RPC `-32000 reconnect` failure; the cause is an npm install failure (exit 190) in the server's `npx` bootstrap, one layer down.
- **Affected layers/integrations:** ONLY the `playwright` MCP server (npx cache hash `9833c18b2d85bc59`). `chrome-devtools` uses a DIFFERENT npx hash and is unaffected; no app/code impact. Blast radius = ISOLATED.
- **Class:** ENVIRONMENT / pre-flight (corrupted package-manager cache), not a code defect.

## 3. Files involved
None in-repo. The corruption is in the user npx cache: `/Users/victor/.npm/_npx/9833c18b2d85bc59/`.

## 4. Resolution (action taken — environment fix)
```
rm -rf /Users/victor/.npm/_npx/9833c18b2d85bc59
```
Safe + reversible (an npx cache dir; npx re-downloads on next run). **Verified:** re-spawning `npx -y
@playwright/mcp@latest` after the clear stays up as a healthy stdio server for 20 s with no `ENOTEMPTY` (exit-code
path gone). The MCP will reconnect on the next Claude Code restart.

**Follow-on (if the `playwright` MCP is actually used):** a fresh install may still need browsers —
`npx playwright install chromium` (or point it at Brave via `--executable-path`). Not blocking: the browser-driving
path in use is `chrome-devtools` → Brave (`--executablePath "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`).

## 5. Prevention
If it recurs (another interrupted install), clear the offending `_npx/<hash>` dir, or `npm cache verify`. A general
reset is `rm -rf ~/.npm/_npx` (all npx caches; heavier — re-downloads everything).
