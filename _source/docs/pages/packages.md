@section cli-package

Tools and libraries some Laravel packages need on the host, through a **closed allowlist**: never a root apt shell. Nothing is installed until you ask. Most come from Ubuntu's own repositories; a few, which Ubuntu doesn't ship, are [upstream releases](#upstream) pinned by version and SHA-256. Since 5.14.0 the catalog has twenty entries, Browsershot's and the [security scanners](#sec) of Hackly included, and the [web panel](#panel) installs and removes them too.

## Commands {#commands}

```bash
$ cipi package list [--json]
$ cipi package install browsershot
$ cipi package install libreoffice
$ cipi package install webp            # one apt package of a group
$ cipi package remove ffmpeg
$ cipi package remove pandoc --yes     # no prompt; required without a terminal (5.14.0+)
```

## Available packages {#available}

| Package | Installs | For |
| --- | --- | --- |
| `image-optimizers` | jpegoptim, optipng, pngquant, gifsicle, webp | `spatie/laravel-image-optimizer` |
| `avif` | `avifenc` | AVIF in `spatie/laravel-image-optimizer` (5.14.0+) |
| `ffmpeg` | `ffmpeg`, `ffprobe` | `pbmedia/laravel-ffmpeg` (run it in a queue worker, never in a request) |
| `imagemagick` | `convert` / `magick` CLI | Code that shells out to ImageMagick (the PHP extension is already installed) |
| `poppler-utils` | `pdftotext`, `pdftoppm` | `spatie/pdf-to-text`, feeding PDFs to search |
| `browsershot` | The libraries and fonts Chrome needs to start | `spatie/browsershot`, `spatie/laravel-pdf` with Browsershot (5.14.0+, [below](#browsershot)) |
| `fonts-cjk` | Noto CJK fonts | Chinese, Japanese and Korean text in PDFs and images (5.14.0+) |
| `pdftk` | `pdftk` (pdftk-java) | `mikehaertl/php-pdftk`: fill forms, merge, split (pulls a headless Java runtime; 5.14.0+) |
| `libreoffice` | `soffice`, Writer and Calc without a GUI | DOCX, XLSX and ODT to PDF with `soffice --headless --convert-to pdf` (5.14.0+) |
| `pandoc` | `pandoc` | `ueberdosis/pandoc`: Markdown, HTML, DOCX, ODT, EPUB (5.14.0+) |
| `tesseract` | `tesseract`, English, Italian, German, French and Spanish | `thiagoalessio/tesseract_ocr` (5.14.0+) |

`cipi package list` marks each entry installed, **partial** (some apt packages missing — `install` completes it) or not installed; `--json` adds what each brings (`binaries`), whether it is tools or libraries (`kind`) and what a partial install lacks (`missing`). Install shows what apt will do (packages, disk space) and asks first; afterwards Cipi checks each binary is on the `PATH`. It refuses to start with less than 1 GB free.

Every entry has to be **stateless** (binaries, libraries, fonts: no daemon, no port, no credentials), **from an Ubuntu repository** (Ubuntu ships its security updates) or an [upstream release pinned in Cipi](#upstream), and backed by a real Laravel or PHP package. Why the catalog is closed, and why that lets the panel use it: [design decisions](/docs/design-decisions#packages). Anything with a daemon, a port or state is a service, not a package: see [search](/docs/search) and [databases](/docs/databases). Names that changed between Ubuntu releases (the 24.04 `t64` libraries) are resolved on the server, so the same entry works on 24.04 and later.

## Security scanners {#sec}

[Hackly](https://github.com/andreapollastri/hackly) scans the domains and repositories of a team: it runs a dozen open-source scanners and keeps their findings. On a Cipi server, the `sec-*` entries install them:

| Package | Source | Installs | Hackly uses it for |
| --- | --- | --- | --- |
| `sec-recon` | Ubuntu | `nmap`, `dig`, `whois` | Port scans, DNS and WHOIS, mail security |
| `sec-gitleaks` | Ubuntu | `gitleaks` | Secrets in repositories |
| `sec-nuclei` | upstream 3.11.1 | `nuclei` | DAST, path discovery, pentests |
| `sec-zap` | upstream 2.17.0 | OWASP ZAP (`zap.sh`) and a Java runtime from Ubuntu | Baseline and pentest scans |
| `sec-nikto` | upstream 2.6.1 | `nikto`, Perl modules from Ubuntu | Pentests. Ubuntu's Nikto is 2.1.5 (2014), with no JSON reports |
| `sec-wpscan` | upstream 3.8.28 | `wpscan`, Ruby from Ubuntu | WordPress targets |
| `sec-trivy` | upstream 0.76.2 | `trivy` | Dependency vulnerabilities (SCA) |
| `sec-semgrep` | upstream 1.185.0 | `semgrep` | Static analysis (SAST) |
| `sec-checkov` | upstream 3.3.26 | `checkov` | Infrastructure as code |

```bash
$ for p in sec-recon sec-gitleaks sec-nuclei sec-zap sec-nikto sec-wpscan sec-trivy sec-semgrep sec-checkov; do
    sudo cipi package install "$p" --yes
  done
$ cipi app artisan hackly hackly:check-binaries
```

A command name works as well (`cipi package install nuclei`). Hackly finds them on the `PATH` (`/usr/local/bin`): no `.env` changes. Install only what the scans you run need — ZAP takes about 1 GB of RAM while it scans, so keep it off a small server that also serves production apps.

> [!warning] Scan only what you're allowed to. Hackly checks DNS ownership before a scan; the tools themselves don't.

Each scanner keeps its own licence. WPScan's isn't an open-source one: testing your own systems and penetration testing are free, selling it as a service needs a commercial licence from its authors. Nmap has its own too (the NPSL: the GPL with extra terms).

## Upstream releases {#upstream}

Ubuntu has no nuclei, ZAP, WPScan, Trivy, Semgrep or Checkov, and its Nikto is too old. Those entries are **upstream releases pinned in Cipi**:

| Pinned | How |
| --- | --- |
| One version per entry | The server never resolves "latest"; a newer version arrives with a Cipi release |
| The download, by SHA-256 | nuclei and ZAP archives, Trivy's `.deb`. A file that doesn't match its pin is refused and deleted, nothing installed. The pins come from upstream's own checksums and manifests, checked against the files |
| A git tag, by commit | Nikto: the `2.6.1` tag must point at the pinned commit |
| Python and Ruby tools, by version | Semgrep and Checkov from PyPI, WPScan from RubyGems, each in a directory of its own; their dependencies are resolved by pip and gem |

Each lives in `/opt/cipi/packages/<id>/<version>`, `current` points at the live version, and its commands are linked into `/usr/local/bin`. A command already there that Cipi didn't install (a script's, Hackly's own installers') is left alone: remove it, or replace it with `--force` at the server's shell, never from the panel. The apt packages an entry needs (a Java runtime, Ruby, Perl modules) come and go with it; one that another package already brought (Java, for `pdftk`) is kept for the entry too, so removing `pdftk` doesn't take it away under ZAP. Build tools (WPScan's `build-essential`) are removed right after the build, and an install that fails puts back what apt installed for it. One `install` or `remove` runs at a time: a second one waits.

Upstream entries aren't updated by unattended-upgrades. When a Cipi release pins a newer version, `cipi package list` marks the entry outdated and `cipi self-update` names it; installing it again updates it (the new version first, `current` swapped, the old one removed):

```bash
$ cipi package list                    # ◐ sec-nuclei   3.10.0 installed, 3.11.1 available
$ sudo cipi package install sec-nuclei --yes
```

## Browsershot {#browsershot}

Browsershot drives Chrome through Puppeteer, and Puppeteer downloads **its own Chrome** for the version it was tested with. What the server lacks is the shared libraries and fonts that Chrome needs to start; that is the `browsershot` entry:

```bash
$ sudo cipi package install browsershot            # once per server
$ cipi app run shop npm install puppeteer          # per app: Chrome comes with it
```

Better still, keep `puppeteer` in the app's `package.json`, so every deploy installs it. Point Browsershot at the app's Node and npm if they aren't on the `PATH` of PHP-FPM (`setNodeBinary()`, `setNpmBinary()`), and render in a queue worker, not in the request: a page takes seconds and hundreds of MB of RAM.

There is **no `chromium` entry on purpose.** On Ubuntu 24.04 `chromium-browser` is a transitional package that installs the snap, with `snapd`: a daemon, outside the allowlist's rules, and a Chrome that isn't the one Puppeteer expects. `wkhtmltopdf` isn't there either: archived upstream, on an unpatched Qt WebKit. Use Browsershot (or `libreoffice` for office documents) instead.

## Removing {#remove}

`cipi package remove` takes **only what no other package needs**: for an upstream entry, its directory, its links and the apt packages only it needed. Before asking, it shows what goes: the entry's packages, and the dependencies that become unused because of them. Dependencies that were already unused before stay where they are; `--autoremove` takes them too, at the server's shell.

When something else on the server depends on a tool entry (software you installed by hand on top of `ffmpeg`, say), the removal stops and names it: nothing is changed. `--force` at the server's shell removes them as well. A tool another package pulled in (`dig`, for `ubuntu-standard`) was never the entry's: it stays.

For a library entry (`browsershot`, `fonts-cjk`) the libraries are often shared: the ones other software still uses stay installed, and when every one of them is still in use nothing is removed, with the reason. Apps that use a removed entry stop working, so the prompt asks first; without a terminal (the panel, a script) it needs `--yes`.

## From the panel {#panel}

The server page of the [web panel](/docs/gui-overview) has a **Packages** tab: the whole catalog, each entry with what it brings (`ffmpeg, ffprobe`, or *Libraries*), what a partial install lacks, the pinned version of an *Upstream* entry (and **Update to x.y.z** when an older one is installed), and since panel 4.6.0 ([API](/docs/api#endpoints-packages) 1.44, Cipi 5.14.0 on the server) **Install**, **Complete install** and **Remove**, confirmed and run as jobs.

Changing needs **Manage** on the server, and the token the `packages-manage` ability. The panel takes only ids the page lists, and the server's catalog is closed whatever is sent: the panel passes `--yes`, its `--force` and `--autoremove` are ignored and the disk check holds. The [MCP server](/docs/mcp) lists the catalog but doesn't install or remove.
