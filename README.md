# Eventful Desk - GitHub/Cloudflare version

1. Replace `__WORKER_URL__` in `api.js` with the exact support Worker URL, without a trailing slash.
2. Upload all HTML/JS files in this package to the root of the public `Helpdesk` repository.
3. Keep `tickets.json`, `customers.json`, `agents.json`, `kb.json`, and `settings.json` only in the private `supportprogram-data` repository.
4. Cloudflare Worker secrets: `GITHUB_TOKEN` and `SUPPORT_ADMIN_KEY`.
5. GitHub Pages: main / root.

SECURITY: The old name/email-only login is preserved for functional parity but is not secure authentication. Use test data only until server-side authentication is implemented. The admin key is session-only and is used for protected administration endpoints.
