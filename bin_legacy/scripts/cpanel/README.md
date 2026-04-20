# cPanel-era deploy scripts (archived)

These Bash scripts targeted **cPanel shared hosting** with:

- Repo clone under `/home/adminvisitsrilan/repositories/vsl360`
- Backend runtime at `/home/adminvisitsrilan/vsl360-backend`
- Frontend static files under `/home/adminvisitsrilan/public_html`
- Broken `npm` binary workaround via `npm-cli.js`

**Current production** uses **Docker Compose on a VPS** — see [DEPLOYMENT_RUNBOOK.md](../../../DEPLOYMENT_RUNBOOK.md).

| Script | Purpose |
|--------|---------|
| `deploy-backend.sh` | Full backend sync, build, Puppeteer browser install, copy `.hbs` templates |
| `deploy-backend-alt.sh` | Shorter variant without Puppeteer/template copy (former `deploy-backend 2.sh`) |
| `deploy-frontend.sh` | Build Vite app and copy `dist/` to `public_html` |

Do not run these unless you still maintain a cPanel environment with the same paths.
