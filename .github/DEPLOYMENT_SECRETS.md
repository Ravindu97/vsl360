# GitHub Actions Deployment Secrets

To enable automated deployment via GitHub Actions, you need to configure the following repository secrets in GitHub.

## Setup Instructions

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of the following:

## Required Secrets

### `CPANEL_HOST`
**Value:** `91.204.209.39`  
**Description:** The IP address or domain of your cPanel server

### `CPANEL_USER`
**Value:** `adminvisitsrilan`  
**Description:** SSH username for cPanel server

### `CPANEL_SSH_KEY`
**Value:** Your private SSH key content  
**How to generate:**
```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/cpanel_deploy_key -N ""
cat ~/.ssh/cpanel_deploy_key
# Copy the entire output (including -----BEGIN and -----END lines)
```

**Add public key to server:**
```bash
# SSH into your cPanel server
ssh adminvisitsrilan@91.204.209.39

# Add your public key
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
[paste public key content from ~/.ssh/cpanel_deploy_key.pub]
EOF

chmod 600 ~/.ssh/authorized_keys
```

### `CPANEL_SSH_PASSPHRASE` (Optional)
**Value:** Leave empty if SSH key has no passphrase  
**Description:** Passphrase for encrypted SSH key (if applicable)

## Workflow Trigger Events

The deployment workflow (`deploy.yml`) will automatically trigger on:

1. **Push to `main` branch** - Automatic staging deployment
2. **Push to `production` branch** - Automatic production deployment
3. **Manual trigger** - Via GitHub Actions UI with environment selection

## Manual Deployment Trigger

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy VSL360** workflow
3. Click **Run workflow**
4. Select environment: `staging` or `production`
5. Click **Run workflow**

## Environment-Specific Deployment

### Staging Deployment (main branch)
- Frontend: `https://admin.visitsrilanka360.com/`
- Backend: `https://api.admin.visitsrilanka360.com/`
- Auto-deploys on push to `main`

### Production Deployment (production branch)
- Same endpoints (shared infrastructure)
- Requires manual approval in GitHub Actions settings (recommended)
- To enable: Settings → Environments → `production` → Deployment branches

## Deployment Steps Automated

1. **Checkout code** from repository
2. **Build frontend** - TypeScript + Vite compilation
3. **Build backend** - TypeScript + copy templates + Prisma generation
4. **Create artifacts** - tar.gz packages for both frontend and backend
5. **Deploy frontend** - Upload to cPanel `public_html`
6. **Deploy backend** - Upload, extract, install, migrate, restart
7. **Verify deployment** - Health check endpoints + HTTP status codes

## Rollback Procedure

If deployment fails or causes issues:

1. SSH into the server:
   ```bash
   ssh adminvisitsrilan@91.204.209.39
   ```

2. **Rollback backend** (if backup exists):
   ```bash
   cd /home/adminvisitsrilan/vsl360-backend
   rm -rf dist node_modules
   cp -r dist.bak dist
   npm ci --omit=dev
   sudo systemctl restart vsl360
   ```

3. **Rollback frontend** (if backup exists):
   ```bash
   cd /home/adminvisitsrilan/public_html
   # Restore from previous deployment if .bak exists
   ```

4. **View deployment logs** on GitHub:
   - Go to **Actions** tab
   - Click failed workflow run
   - View full output for error details

## Troubleshooting

### "Permission denied (publickey)" during deployment
- Verify SSH public key is in `~/.ssh/authorized_keys` on server
- Check file permissions: `ls -la ~/.ssh/` (should be 700 for dir, 600 for key)

### "nodeNotFound" on cPanel
- Workflow uses `/opt/alt/alt-nodejs20/root/usr/bin/node` path
- Verify Node 20 is available: `ls /opt/alt/alt-nodejs20/root/usr/bin/node`

### Templates not found after deployment
- Verify `copy-assets.js` script is running
- Check `dist/templates/` exists on server
- Rebuild locally: `cd backend && npm run build`

### Database migration failed
- Ensure `DATABASE_URL` is set in `/home/adminvisitsrilan/.config/vsl360/backend.env`
- Verify database connectivity: `psql -U adminvisitsrilan_admin -h localhost -d adminvisitsrilan_vsl360`

## Monitor Deployment Status

1. **GitHub Actions Dashboard:**
   - Go to **Actions** → **Deploy VSL360**
   - View real-time build and deployment logs

2. **Health Endpoints:**
   ```bash
   # Backend health
   curl https://api.admin.visitsrilanka360.com/api/health
   
   # Frontend availability
   curl -I https://admin.visitsrilanka360.com/
   ```

3. **SSH Logs on Server:**
   ```bash
   # Check backend startup
   sudo systemctl status vsl360
   sudo journalctl -u vsl360 -f
   ```

## Best Practices

✓ **Do:**
- Test changes locally before pushing to `main`
- Use descriptive commit messages
- Deploy to `main` first for testing
- Monitor health endpoints after deployment
- Keep SSH key securely backed up

✗ **Don't:**
- Store secrets in code or commit messages
- Deploy during peak usage hours without testing
- Modify running containers directly (use git + workflow)
- Commit `.env` files with real credentials

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Management](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh)
