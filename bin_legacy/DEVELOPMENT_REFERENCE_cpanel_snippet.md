# Archived excerpt (cPanel production — from DEVELOPMENT_REFERENCE.md)

**Do not use for current production.** See [DEPLOYMENT_cpanel_legacy.md](DEPLOYMENT_cpanel_legacy.md) for the full runbook.

## Former "Current Production Deployment Approach" text

The production environment **previously** used cPanel shared hosting, so deployment was based on a Git repository clone on the server rather than local release artifacts.

- The repository was cloned on the server at `/home/adminvisitsrilan/repositories/vsl360`
- Backend runtime files were synced into `/home/adminvisitsrilan/vsl360-backend`
- Frontend was built on the server and copied into `/home/adminvisitsrilan/public_html`
- Environment files had to remain outside the destructive sync paths when possible
- Native Node modules such as `bcrypt` had to be installed on the Linux server, not copied from macOS builds

## Former "Recommended Production Automation" text

GitHub Actions SSH’d into the server and ran version-controlled deploy scripts:

- Backend: `scripts/deploy-backend.sh` (now archived under `bin_legacy/scripts/cpanel/`)
- Frontend: `scripts/deploy-frontend.sh` (archived)
- Workflow: `.github/workflows/deploy.yml` (now VPS/Docker-based)
