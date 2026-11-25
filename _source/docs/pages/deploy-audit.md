@section deploy-audit

Every deploy, rollback and failure is written to a tamper-evident ledger, whoever started it: the CLI, the panel, a webhook, an AI agent, cron or someone typing `dep deploy` over SSH. Useful for incident reviews and for auditors.

```bash
$ cipi deploy myapp --audit                    # last 90 days
$ cipi deploy myapp --audit --days=365 --json
$ cipi compliance deploys                      # verify the chain, find gaps
```

## What a record proves {#record}

The app's deploy recipe calls a root-owned helper at each outcome. Root **verifies** facts itself instead of trusting the caller:

| Field | Source |
| --- | --- |
| Event | `published`, `failed`, `rollback` |
| Release and commit | Read from disk by root |
| Origin | From the process chain: `cipi-cli`, `panel`, `webhook`, `app-queue`, `ssh`, `cron`, `root-shell`… |
| Operator | The login user ID set by PAM (the user can't change it) |
| IP | The SSH client address |
| Claimed | What only the app can say (e.g. who clicked deploy in an MCP client), kept apart from verified facts |

## The ledger {#ledger}

`/var/log/cipi/deploys.jsonl` is root-only. Each line carries a sequence number and the SHA-256 of the previous line, and is also sent to syslog (`cipi-deploy`), so log forwarding keeps an independent copy off the server.

| `cipi compliance deploys` | When |
| --- | --- |
| **Fails** | The hash chain is broken |
| **Warns** | An app's recipe lost its hook, its sudo rule is missing, or Deployer knows a release the ledger never saw |

The panel shows the ledger on each app's Deploy tab; the API serves it at `GET /api/apps/{name}/deploy/audit`.

`cipi deploy myapp --audit --json` (and so the API and the panel) adds a `subject` to each record: the first line of the commit's message, read from the app's own Git clone when you ask (Cipi 5.14.0+). It is **not** in the ledger and no hash covers it: the record proves which commit went live, the clone says what it's called. A commit the clone no longer has gets none.

> [!note] The chain proves nothing older than the newest record was changed. Root could still rewrite the whole file, which is why the syslog copy matters. File edits over SFTP are not deploys; [malware scan](/docs/malware-scan) integrity covers those.
