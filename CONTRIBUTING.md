# Contributing to Keystone

Thanks for helping improve Keystone. The project is intentionally small, so focused changes and clear reasoning are more valuable than large refactors.

## Before you start

1. Read the [README](README.md) and [Engineering Notes](docs/engineering-notes.md).
2. Check existing issues or open one describing the problem and proposed direction.
3. Never include secrets, real project records, or private customer data in commits or screenshots.

## Local workflow

```bash
cd server && npm install
cd ../client && npm install
```

Run the API and frontend in separate terminals as described in the README. Before opening a pull request, run:

```bash
cd client && npm run build
cd ../server && node --check src/server.js
```

## Change guidelines

- Keep changes focused and consistent with the existing JavaScript style.
- Preserve human-authored state when changing AI reconciliation logic.
- Add or update documentation when behavior, environment variables, or API routes change.
- Treat parser changes as compatibility changes: retain unrecognised input instead of silently dropping it.
- Do not add dependencies unless the problem cannot be solved clearly with the current stack.

## Pull requests

Describe the user problem, the behavior that changed, and how you verified it. Include screenshots for meaningful UI changes and call out any migration, environment, or security impact.

## Commit messages

Use short imperative messages, for example:

- `Improve transcript date parsing`
- `Preserve resolved conflicts during analysis`
- `Document production configuration`
