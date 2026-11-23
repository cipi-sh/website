@section cli-package

Tools some Laravel packages need on the host, from Ubuntu's own repositories, through a **closed allowlist**: never a root apt shell. Nothing is installed until you ask.

## Commands {#commands}

```bash
$ cipi package list
$ cipi package install image-optimizers
$ cipi package install ffmpeg
$ cipi package install webp            # one binary from a group
$ cipi package remove ffmpeg
```

## Available packages {#available}

| Package | Installs | For |
| --- | --- | --- |
| `image-optimizers` | jpegoptim, optipng, pngquant, gifsicle, webp | `spatie/laravel-image-optimizer` |
| `ffmpeg` | ffmpeg | `pbmedia/laravel-ffmpeg` (run it in a queue worker, never in a request) |
| `imagemagick` | `convert` / `magick` CLI | Code that shells out to ImageMagick (the PHP extension is already installed) |
| `poppler-utils` | `pdftotext` | `spatie/pdf-to-text`, feeding PDFs to search |

Install and remove show what apt will do (packages, disk space) and ask first; afterwards Cipi checks each binary is on the `PATH`. Removal previews orphaned dependencies before cleaning them up. Anything with a daemon, a port or state is a service, not a package: see [search](/docs/search) and [databases](/docs/databases).
