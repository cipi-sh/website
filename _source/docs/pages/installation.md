@section requirements

One command turns a fresh Ubuntu server into a hardened, production-ready host. This page covers what the server needs, the SSH key, the installer and how you log in afterwards.

## Requirements

| Need | Why |
| --- | --- |
| **Ubuntu 24.04 or 26.04 LTS**, fresh install | Cipi owns the whole stack; an existing web stack would conflict |
| **Full VM or bare metal** (KVM, VMware, Hyper-V, Xen HVM) | Cipi tunes the firewall, swap and kernel, which needs its own kernel |
| **Public IPv4**, ports 22, 80, 443 open | Let's Encrypt and your visitors must reach the server |
| Root or sudo access | To install packages and harden SSH |

Works on DigitalOcean, Hetzner, AWS EC2, Vultr, Linode, Google Cloud, OVH, Scaleway and any KVM or bare-metal host. The installer checks the environment first: in a container (Docker, LXC, OpenVZ, WSL, OrbStack…) it stops and tells you why.

> [!warning] **Cipi is for real servers, not laptops.** A local VM or container may look like it works, but certificates, domains and deploys will not. See [Why not local?](/docs/design-decisions#why-not-local).

@section installation

## Install

```flow
SSH key | on your laptop | #ssh-key
Installer | on the server | #run-installer
Unattended | for scripts and images | #unattended
Hardening | what gets secured | #hardening
Log in | as cipi, credentials saved | #post-install
```

<cipi-term name="install"></cipi-term>

### 1. Get your SSH public key {#ssh-key}

On **your computer** (not the server), print your public key, or create one if you have none:

```bash
$ cat ~/.ssh/id_ed25519.pub                       # existing key
$ ssh-keygen -t ed25519 -C "you@example.com"     # create one (Enter = default path)
```

Copy the whole `ssh-ed25519 AAAA… comment` line. Only the `.pub` file is public; never paste the private `id_ed25519`.

### 2. Run the installer on the server {#run-installer}

```bash
$ ssh root@your-server-ip
$ wget -O - https://cipi.sh/setup.sh | bash
```

On AWS, log in as `ubuntu` and run `sudo -s` first. The installer then:

1. Asks for your public key (and any more: a second laptop, a colleague) before installing anything.
2. Shows its plan: IP, OS, SSH access, stack, passwords. Answer `n` and nothing has changed.
3. Installs Nginx, PHP, MariaDB, Valkey, Supervisor, Composer, Deployer, Certbot, UFW and Fail2ban, and hardens SSH.
4. Prints the credentials (root, MariaDB, Valkey) and waits until you confirm you saved them.
5. Offers the optional extras: a Git provider token (so deploy keys and webhooks are set up for you), the panel API and the web panel.

### Unattended install {#unattended}

Pass the key in `SSH_PUBKEY` (several keys: one per line). Without a terminal the installer asks nothing. Set the variable on `bash`, the side of the pipe that runs the installer (or `export` it first): placed before `wget`, only `wget` would see it.

```bash
$ wget -O - https://cipi.sh/setup.sh | SSH_PUBKEY="ssh-ed25519 AAAA..." bash
```

## What the installer secures {#hardening}

| Area | Setting |
| --- | --- |
| SSH | Root login off; `cipi` user with **key only**; 3 attempts, 20 s grace; X11 off |
| Firewall | UFW allows only 22, 80, 443 |
| Brute force | Fail2ban with progressive bans |
| Patches | Unattended security upgrades |
| Secrets | Root, database and Valkey passwords are random and stored **encrypted** (AES-256) in `/etc/cipi/server.json` |
| Logs | Rotation and retention for app, security and HTTP logs ([Log retention](/docs/log-retention)) |

## Log in after the install {#post-install}

| Who | How |
| --- | --- |
| You (admin) | `ssh cipi@server` with your key, then `sudo cipi …` (no password) |
| Root | From the `cipi` session: `su root` with the root password from the summary |
| An app | `ssh myapp@server` with the app's password, or `su - myapp` as root |

```bash
$ ssh cipi@your-server-ip
$ sudo cipi status          # any cipi command, no password
$ su root                   # full root shell when you need one
```

> [!tip] Lost the credentials? `sudo cipi credentials` prints them again; `sudo cipi credentials export` writes a CSV your password manager can import.

## Common problems {#problems}

| Problem | Fix |
| --- | --- |
| Installer refuses the OS | Reinstall the VPS with plain Ubuntu 24.04 or 26.04 LTS |
| Pasted key refused | Paste the **public** key (`.pub`), one line starting with `ssh-ed25519` or `ssh-rsa` |
| Can't log in after the install | Root login is disabled: `ssh cipi@IP`. Lost the key? Use the provider's web console |
| Install interrupted | Run the same command again; steps already done are skipped |

## Questions {#questions}

| Question | Answer |
| --- | --- |
| Can I install on a server with other software? | No. Cipi needs a fresh server: it configures Nginx, PHP, users and the firewall its own way. |
| Which size? | 1 GB RAM works for a small app; 2–4 GB is comfortable for several. |
| Where are the credentials? | Printed at the end of the install, once. Save them in a password manager. |
