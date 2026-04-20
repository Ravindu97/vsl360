# Legacy archive (`bin_legacy`)

This folder holds **historical** deployment material that is **not** used for current production.

## Current production

VPS + **Docker Compose** + host Nginx + SSL. Authoritative docs:

- [DEPLOYMENT_RUNBOOK.md](../DEPLOYMENT_RUNBOOK.md) — provisioning, env, CI/CD, operations
- [LOCAL_DOCKER.md](../LOCAL_DOCKER.md) — local Docker stack

## What is archived here

| Item | Description |
|------|-------------|
| [DEPLOYMENT_cpanel_legacy.md](DEPLOYMENT_cpanel_legacy.md) | Full cPanel shared-hosting deployment runbook (paths, socket DB, GitHub `CPANEL_*` secrets era) |
| [DEVELOPMENT_REFERENCE_cpanel_snippet.md](DEVELOPMENT_REFERENCE_cpanel_snippet.md) | Excerpt formerly in [DEVELOPMENT_REFERENCE.md](../DEVELOPMENT_REFERENCE.md) |
| [scripts/cpanel/](scripts/cpanel/) | Bash deploy scripts for cPanel (`public_html`, `adminvisitsrilan` paths) |

Do **not** follow these for new deploys unless you still operate a cPanel mirror.
