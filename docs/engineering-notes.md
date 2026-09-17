# Engineering Notes

This document records the difficult parts of Keystone and the decisions made to keep the prototype useful under imperfect input. It is deliberately honest about what is solved, what is simplified, and what should happen next.

## Core challenges

| Challenge | Decision | Why it matters | Next improvement |
| --- | --- | --- | --- |
| Project communication arrives in inconsistent formats | Use layered transcript parsing for WhatsApp exports, email-like headers, timecodes, plain speaker prefixes, and continuation lines | A parser that accepts only one export format loses the exact context the product is meant to recover | Add fixture-based tests and an import preview before persistence |
| Relative dates depend on the conversation date and locale | Resolve explicit dates without relying on JavaScript's ambiguous date parsing; resolve AI relative dates against the current date | A wrong date turns a useful task into a false deadline | Store the source phrase and project timezone alongside the normalized date |
| AI output can be incomplete or wrong | Require structured JSON, validate source indexes, ignore malformed records, and fall back to the latest cached digest | The application should remain readable when the provider is unavailable or uncertain | Add schema validation, confidence indicators, retries, and a review queue |
| Re-analysis can destroy human work | Reconcile records by normalized description and preserve completion, resolution, and sign-off state | Re-running analysis must not reopen work a person already completed | Introduce stable extraction IDs and an explicit change review view |
| Project records need scoped access | Authenticate with JWTs and verify project membership on project routes | A project tool must not expose another team's messages through an ID alone | Add organization tenancy, invitations, roles, and audit events |
| Demo speed competes with production reliability | Keep analysis synchronous for the prototype and expose a manual re-analysis action after the first digest | The simple flow is easy to demonstrate and reason about | Move analysis to a durable background job with progress and retries |

## Deliberate prototype boundaries

- Pasted text is the first ingestion surface; direct WhatsApp, email, PDF, and storage integrations are not yet implemented.
- MongoDB is accessed through Mongoose models without a migration framework because the current schema is small and demo-oriented.
- There is no queue, rate limiter, observability pipeline, or automated deployment configuration yet.
- The AI provider receives message content during analysis. A production deployment needs a documented data-processing policy, retention rules, and provider review.
- The current search is project-memory filtering rather than a dedicated full-text search index.

These are known boundaries, not hidden promises. They are reflected in the README roadmap.

## Quality bar for future changes

A change is ready when it:

1. Preserves existing user-authored state.
2. Handles malformed or partial input without silently losing data.
3. Keeps secrets and tenant boundaries explicit.
4. Includes a focused verification step and updates documentation when behavior changes.
5. Leaves the demo path understandable for a new contributor.
