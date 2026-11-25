@section cli-package

Tools and libraries some Laravel packages need on the host, from Ubuntu's own repositories, through a **closed allowlist**: never a root apt shell. Nothing is installed until you ask. Since 5.14.0 the catalog has eleven entries, Browsershot's included, and the [web panel](#panel) installs and removes them too.

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

Every entry has to be **stateless** (binaries, libraries, fonts: no daemon, no port, no credentials), **from an Ubuntu repository** (Ubuntu ships its security updates) and backed by a real Laravel or PHP package. Why the catalog is closed, and why that lets the panel use it: [design decisions](/docs/design-decisions#packages). Anything with a daemon, a port or state is a service, not a package: see [search](/docs/search) and [databases](/docs/databases). Names that changed between Ubuntu releases (the 24.04 `t64` libraries) are resolved on the server, so the same entry works on 24.04 and later.

## Browsershot {#browsershot}

Browsershot drives Chrome through Puppeteer, and Puppeteer downloads **its own Chrome** for the version it was tested with. What the server lacks is the shared libraries and fonts that Chrome needs to start; that is the `browsershot` entry:

```bash
$ sudo cipi package install browsershot            # once per server
$ cipi app run shop npm install puppeteer          # per app: Chrome comes with it
```

Better still, keep `puppeteer` in the app's `package.json`, so every deploy installs it. Point Browsershot at the app's Node and npm if they aren't on the `PATH` of PHP-FPM (`setNodeBinary()`, `setNpmBinary()`), and render in a queue worker, not in the request: a page takes seconds and hundreds of MB of RAM.

There is **no `chromium` entry on purpose.** On Ubuntu 24.04 `chromium-browser` is a transitional package that installs the snap, with `snapd`: a daemon, outside the allowlist's rules, and a Chrome that isn't the one Puppeteer expects. `wkhtmltopdf` isn't there either: archived upstream, on an unpatched Qt WebKit. Use Browsershot (or `libreoffice` for office documents) instead.

## Removing {#remove}

`cipi package remove` takes **only what no other package needs**. Before asking, it shows what goes: the entry's packages, and the dependencies that become unused because of them. Dependencies that were already unused before stay where they are; `--autoremove` takes them too, at the server's shell.

When something else on the server depends on a tool entry (software you installed by hand on top of `ffmpeg`, say), the removal stops and names it: nothing is changed. `--force` at the server's shell removes them as well.

For a library entry (`browsershot`, `fonts-cjk`) the libraries are often shared: the ones other software still uses stay installed, and when every one of them is still in use nothing is removed, with the reason. Apps that use a removed entry stop working, so the prompt asks first; without a terminal (the panel, a script) it needs `--yes`.

## From the panel {#panel}

The server page of the [web panel](/docs/gui-overview) has a **Packages** tab: the whole catalog, each entry with what it brings (`ffmpeg, ffprobe`, or *Libraries*), what a partial install lacks, and since panel 4.6.0 ([API](/docs/api#endpoints-packages) 1.44, Cipi 5.14.0 on the server) **Install**, **Complete install** and **Remove**, confirmed and run as jobs.

Changing needs **Manage** on the server, and the token the `packages-manage` ability. The panel takes only ids the page lists, and the server's catalog is closed whatever is sent: the panel passes `--yes`, its `--force` and `--autoremove` are ignored and the disk check holds. The [MCP server](/docs/mcp) lists the catalog but doesn't install or remove.
