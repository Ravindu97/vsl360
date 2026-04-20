# Scripts

## Active

- **`convert-itinerary-csv-to-yaml.mjs`** — utility to convert itinerary CSV data (see script header for usage).

## Deployment

Production deployments use **Docker Compose** on the VPS and optionally **GitHub Actions** (see [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)).

Authoritative steps: **[DEPLOYMENT_RUNBOOK.md](../DEPLOYMENT_RUNBOOK.md)**.

## Legacy (cPanel)

Former cPanel deploy scripts (`deploy-backend.sh`, `deploy-frontend.sh`, etc.) are archived under **[bin_legacy/scripts/cpanel/](../bin_legacy/scripts/cpanel/)**.
