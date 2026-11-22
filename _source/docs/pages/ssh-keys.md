@section cli-ssh

The `cipi` user is the admin entry point: **key-only**, no passwords, no root login. Manage its keys from the CLI, with guards against locking yourself out.

```bash
$ cipi ssh list                         # keys, fingerprints, current-session marker
$ cipi ssh add "ssh-ed25519 AAAA… john@laptop"
$ cipi ssh rename 2 "john-macbook"
$ cipi ssh remove 2
```

| Guard | Effect |
| --- | --- |
| Format validation, duplicate check | No broken or repeated keys |
| Current-session protection | You can't remove the key you're logged in with |
| Last-key protection | You can't remove the last key |
| Alerts | Every add, remove, rename notified with fingerprint and remaining count |

Also via REST (`GET|POST /api/ssh/keys`) and the panel.

@section cli-ssh-apps

## App users' SSH and SFTP {#cli-ssh-apps}

Each app user can log in with its own password and keys; the server's admin keys always work for every app (`ssh shop@server` with your usual key). Decide per app, or for all of them, whether more is allowed from outside:

```bash
$ cipi ssh apps                    # every app: enabled or disabled
$ cipi ssh apps disable shop       # from outside: admin keys only
$ cipi ssh apps enable shop        # also its password and its own keys
$ cipi ssh apps disable --all      # every app, and new apps from now on
```

| State | From another machine | From the server (deploys) |
| --- | --- | --- |
| Enabled | Admin keys, app password, app's own keys | Unchanged |
| Disabled | Admin keys only | Unchanged |

New servers create apps **disabled** (safer for agencies handing out SFTP rarely). Changes are validated with `sshd -t` on a copy and applied with a reload, so a bad config never replaces the live one. Removing a key with `cipi ssh remove` revokes it for every app at once.
