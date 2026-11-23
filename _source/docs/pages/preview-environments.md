@section preview-environments

Give every branch its own live URL: a complete app with database, workers and HTTPS, created on the first push and deleted with the branch. Reviewers click a link instead of pulling code.

```flow
Push feature/x | to any non-main branch
> A developer pushes a branch other than `main`. The CI workflow starts.
CI computes a name | stable per branch
> The workflow derives a stable app name from the branch (so every push to the same branch updates the same preview).
Create or deploy | cipi app create / deploy
> First push: `cipi app create` makes a full app (user, database, worker). Later pushes: `cipi deploy`.
Live URL | feature-x-shop-3a1f9c2e.preview.example.com
> The preview is live on its own subdomain of the wildcard domain, with HTTPS from the wildcard certificate.
Branch deleted | app deleted
> When the branch is deleted, the workflow deletes the app and its database.
```

## One-time setup {#setup}

| Step | How |
| --- | --- |
| Wildcard DNS | `A *.preview.example.com → server IP` |
| Wildcard certificate | With the Cloudflare token Cipi keeps: `certbot certonly --dns-cloudflare --dns-cloudflare-credentials /etc/cipi/cloudflare.ini -d preview.example.com -d '*.preview.example.com' --cert-name preview.example.com` (renews by itself). Without Cloudflare: [Wildcard domains](/docs/wildcard-domains) |
| Repository access | A read-only token (`GH_PAT`, `GL_TOKEN`), so previews need no deploy key |
| CI secrets | `SERVER_HOST`, `SERVER_SSH_KEY`, `DEPLOY_WILDCARD_DOMAIN` |

## The server-side script {#script}

Commit this as `.cipi/preview.sh`; the pipeline sends it over SSH. It creates the app once, adds HTTPS with the wildcard certificate, then deploys.

```bash
#!/usr/bin/env bash
# usage: preview.sh <up|down> <app> <domain> <repo-url> <branch> <wildcard-base>
set -euo pipefail
ACTION=$1 APP=$2 DOMAIN=$3 REPO=$4 BRANCH=$5 BASE=$6
CERT=/etc/letsencrypt/live/$BASE
if [ "$ACTION" = down ]; then
  cipi app show "$APP" &>/dev/null && cipi app delete "$APP" --force || true
  exit 0
fi
if ! cipi app show "$APP" &>/dev/null; then
  cipi app create --user="$APP" --domain="$DOMAIN" --repository="$REPO" --branch="$BRANCH"
  awk -v c="$CERT" '/^    listen 80;/{print; print "    listen 443 ssl;"; print "    ssl_certificate " c "/fullchain.pem;"; print "    ssl_certificate_key " c "/privkey.pem;"; next}{print}' \
    "/etc/nginx/sites-available/$APP" > /tmp/vhost && mv /tmp/vhost "/etc/nginx/sites-available/$APP"
  nginx -t && systemctl reload nginx
fi
cipi deploy "$APP"
```

## The pipeline (GitHub Actions) {#github}

```yaml
# .github/workflows/preview.yml
name: Preview
on:
  push: { branches-ignore: [main] }
  delete:
jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: ids
        run: |
          REF="${{ github.event.ref || github.ref_name }}"; REF="${REF#refs/heads/}"
          B=$(echo "$REF" | tr A-Z a-z | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//')
          P=$(echo "${{ github.event.repository.name }}" | tr A-Z a-z | sed 's/[^a-z0-9]/-/g')
          H=$(echo -n "$B$P" | md5sum | cut -c1-8)
          echo "app=pr$H" >> $GITHUB_OUTPUT
          echo "domain=$B-$P-$H.${{ secrets.DEPLOY_WILDCARD_DOMAIN }}" >> $GITHUB_OUTPUT
          echo "branch=$REF" >> $GITHUB_OUTPUT
      - run: |
          echo "${{ secrets.SERVER_SSH_KEY }}" > key && chmod 600 key
          ACTION=${{ github.event_name == 'delete' && 'down' || 'up' }}
          ssh -i key -o StrictHostKeyChecking=accept-new cipi@${{ secrets.SERVER_HOST }} \
            "sudo bash -s -- $ACTION ${{ steps.ids.outputs.app }} ${{ steps.ids.outputs.domain }} \
             https://oauth2:${{ secrets.GH_PAT }}@github.com/${{ github.repository }}.git \
             ${{ steps.ids.outputs.branch }} ${{ secrets.DEPLOY_WILDCARD_DOMAIN }}" < .cipi/preview.sh
          echo "Preview: https://${{ steps.ids.outputs.domain }}"
```

GitLab works the same way: compute the identifiers from `$CI_COMMIT_REF_NAME` and `$CI_PROJECT_NAME`, and run the `down` action in a job with `when: manual` or on merge-request events.

| Name part | Why |
| --- | --- |
| `pr<hash>` app user | Valid Linux user, stable for the branch, so re-runs update instead of duplicating |
| `branch-project-hash` domain | Readable and unique |

## Good to know {#notes}

> [!warning] Each preview is a full app: user, database, PHP pool, worker. On a small VPS, prune stale ones (`cipi app list`), or keep previews on a dedicated server.

- Write `listen 443 ssl;` (no `http2`), like every vhost Cipi writes; `cipi nginx security` flags vhosts that enable HTTP/2 ([Nginx](/docs/nginx)).
- Don't run `cipi ssl install` on a preview: the wildcard certificate already covers it.
