@section safe-deploy

A safe deploy has a restore point taken **before** new code and migrations touch production. Cipi gives you two levels; use one or both.

| Level | How | Restores | Where it lives |
| --- | --- | --- | --- |
| Database snapshot | `--snapshot` or `--predeploy-snapshot` | The database | On the server |
| Full backup | `cipi backup run` in a pipeline stage | Database + files (`shared/`: `.env`, uploads) | S3 or any S3-compatible bucket |

```flow
Tests pass | CI
Snapshot / backup | restore point
Deploy | atomic swap
Health check | automatic rollback if broken
```

@section predeploy-snapshot

## Database snapshot before every deploy {#snapshot}

```bash
$ cipi deploy shop --snapshot             # dump first; warn and continue if it fails
$ cipi deploy shop --snapshot-required    # dump first; abort the deploy if it fails
$ cipi app edit shop --predeploy-snapshot # always, for every trigger (CLI, webhook, CI)
```

Dumps go to `/var/log/cipi/backups/`, the same place as [cipi db backup](/docs/databases).

> [!warning] `cipi deploy --rollback` restores **code**, not data. To undo a migration, restore the snapshot: `cipi db restore shop /var/log/cipi/backups/shop_<timestamp>.sql.gz`.

## Full backup in a pipeline {#pipeline}

A webhook deploys as soon as you push, so an off-site backup step belongs in a [CI pipeline](/docs/ci-pipelines). Configure S3 once with `cipi backup configure`.

```yaml
# .github/workflows/deploy.yml (jobs only)
  backup:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: cipi
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: sudo cipi db backup shop && sudo cipi backup run --profile=shop-nightly
  deploy:
    needs: backup
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: cipi
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: sudo cipi deploy shop || (sudo cipi deploy shop --rollback && exit 1)
```

`test` → `backup` → `deploy`: if one fails, the next never runs; if the deploy fails, the previous release is restored.

## Restore {#restore}

```bash
$ ls -lh /var/log/cipi/backups/shop_*.sql.gz
$ cipi db restore shop /var/log/cipi/backups/shop_20261103_143012.sql.gz
$ cipi deploy shop --rollback
# from S3
$ cipi backup list --profile=shop-nightly
$ cipi backup fetch shop-nightly 2026-11-03_020000 --dest=/root/restore
```

Local snapshots are kept until you remove them; see [Backups](/docs/backups) for retention rules that prune automatically.
