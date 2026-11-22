@section cli-node

Official Node.js builds for [Node apps](/docs/node-apps) and for Laravel asset builds. Every download is verified against nodejs.org's `SHASUMS256.txt`; only even (LTS) majors are offered.

```bash
$ cipi node install 24            # x64 or arm64, checksum-verified
$ cipi node list                  # majors, default, apps on each
$ cipi node upgrade 22 --restart  # latest patch; SSR apps restart blue/green
$ cipi node default 22            # server-wide Node for builds, app run, deploy.post
$ cipi node default system        # back to the distribution package
$ cipi node remove 20             # refused while in use
```

| Layer | Picks the Node used by |
| --- | --- |
| Server default (`cipi node default`) | Laravel `--node-build`, `cipi app run … npm`, `deploy.post`, new Node apps |
| Per Laravel app (`cipi app edit myapp --node-version=24`) | That app's builds only |
| Per Node app (`--node-version`) | That app's runtime |

Runtimes live in `/opt/cipi/node/<version>` behind an atomic symlink per major, so `cipi node upgrade` moves every app on that major at once. Files you installed yourself in `/usr/local/bin` are never overwritten. The panel can list runtimes and restart Node apps; installing software stays a root-only CLI action.
