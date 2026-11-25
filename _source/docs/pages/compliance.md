@section cli-compliance

Under an ISO 27001 or SOC 2 audit, you need **evidence** that your hosting meets the controls. `cipi compliance` collects it from the server, read-only, in a form an auditor accepts.

```bash
$ cipi compliance                     # 17 controls: pass / warn / fail / info
$ cipi compliance tls --days=30       # one control
$ cipi compliance --json              # exit 1 on any fail: gate CI or cron
$ cipi compliance report [--days=365] # evidence bundle
$ cipi compliance controls            # mapping to ISO 27001:2022 Annex A and SOC 2
```

## Controls {#controls}

| Control | Checks |
| --- | --- |
| `ssh`, `ssh_keys`, `accounts` | Effective sshd config; key types and sizes; UID 0, empty passwords, sudoers |
| `firewall`, `intrusion`, `kernel` | UFW default deny; Fail2ban/CrowdSec; network sysctls |
| `patching`, `time` | Security updates, reboots pending; NTP |
| `tls` | Protocols, HSTS, certificate expiry and key type |
| `api_tokens`, `gui_2fa` | Token expiry, scope, IP allowlists; two-factor on panel accounts: [required](/docs/gui-install#two-factor-required) with everyone enrolled passes, required with accounts still to enrol warns and names them (5.14.0+) |
| `secrets` | Encrypted, root-only configuration |
| `deploys` | [Deploy audit](/docs/deploy-audit) chain intact, hooks present, no unaudited releases |
| `backups` | Freshness, off-site copy, encryption |
| `logging`, `monitoring` | Forwarding, history, auditd; monitor and alert delivery |
| `malware` | [Malware scan](/docs/malware-scan) enabled |

## The evidence bundle {#report}

```tree
/var/log/cipi/compliance/<host>-<time>/
├── report.md          # for the auditor
├── report.json        # for tooling
├── evidence/<control>/…   # raw output behind each finding
└── SHA256SUMS         # + a .tar.gz and its checksum
```

Root-only. Record the printed archive checksum **outside the server** to prove later that the bundle is unaltered. No secrets are included: token and password hashes, 2FA secrets and backup credentials are never selected; SSH keys appear as fingerprints.

For the wider picture (SSO, roles, scoped tokens, the audit trail and what to add around Cipi in a larger organisation), see [Cipi in the enterprise](/guides/cipi-enterprise).

> [!note] The report is candid about limits (for example, encryption without a MAC, restore tests not recorded) so the auditor hears it from you first. Cipi's deliberate choices, like patching Nginx and databases on its own schedule, appear as notes, not failures.
