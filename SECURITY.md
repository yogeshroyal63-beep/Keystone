# Security Policy

## Supported versions

Keystone is currently an active prototype. Only the latest version on the default branch is supported.

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability. Report it privately to the project maintainers through the repository's private security reporting channel. Include:

- A concise description of the issue and its impact.
- The affected route, component, or configuration.
- Reproduction steps or a minimal proof of concept.
- Any suggested mitigation, if available.

Please allow maintainers reasonable time to investigate before public disclosure. Do not include real credentials, private project conversations, or personal data in a report.

## Deployment baseline

Before any non-demo deployment:

- Set a long, random `JWT_SECRET`; the server refuses to start without one.
- Keep `GROQ_API_KEY`, `MONGODB_URI`, and `.env` outside source control.
- Use TLS in front of the API and restrict CORS to known frontend origins.
- Use a managed MongoDB user with the minimum required permissions.
- Rotate credentials if they appear in logs, commits, screenshots, or chat.
- Review retention and access requirements before sending project communication to an external AI provider.
