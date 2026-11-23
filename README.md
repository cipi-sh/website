# CIPI Website

Source of [cipi.sh](https://cipi.sh/). Static HTML served by Netlify as is (no build step on deploy):
the generated pages are committed.

## Layout

| Path | What it is |
| --- | --- |
| `_source/pages/index.html` | Home page template |
| `_source/docs/nav.json` | Docs structure: groups, pages, titles, descriptions |
| `_source/docs/pages/<slug>.html` | Content of each docs page (HTML fragment) |
| `_source/docs/terms.json` | Scripts for the animated terminals used in the docs |
| `_source/docs/anchors.json` | Old `/docs/<page>#<id>` anchors → new page, used for redirects |
| `_source/partials/` | Shared head, header, footer, search dialog, analytics |
| `assets/` | CSS and JS for the whole site |
| `scripts/build.py` | Builds `index.html`, `docs/*.html`, the search index, and syncs header/footer on every other page |
| `scripts/content.py` | Builds guides (`_source/guides/*.md` → `guides/`, index, RSS), comparisons (`_source/compare/*.md` → `alternative-to-*.html`, `alternatives.html`) and `_source/pages/*.md` (e.g. `/cipi-yml`) |
| `scripts/llms.py` | Writes `llms.txt` and `llms-full.txt` from the same Markdown sources |
| `scripts/og.py` | Renders 1200×630 Open Graph images into `img/og/` (Playwright; run when titles change) |
| `scripts/generate-sitemap.py` | Rewrites `sitemap.xml` |

## Editing

```bash
# edit _source/… then
python3 scripts/build.py          # home + 404 + docs + header/footer sync
python3 scripts/content.py        # guides, comparisons, cipi.yml page
python3 scripts/llms.py && python3 scripts/generate-sitemap.py
python3 scripts/generate-sitemap.py
python3 -m http.server            # or any static server; docs URLs need .html fallback
```

In a docs fragment:

- `<cipi-term name="deploy"></cipi-term>` inserts an animated terminal from `_source/docs/terms.json`
  (plays when scrolled into view; click to skip; reduced motion shows the final state).
- `<cipi-panel></cipi-panel>` inserts the animated web panel tour.
- `h2` / `h3` get ids and anchors automatically and feed the "On this page" list and search.

To add a page, add it to `nav.json`, create `_source/docs/pages/<slug>.html`, and run the build.

## Old URLs

`/docs/apps`, `/docs/deploy`, `/docs/infrastructure`, `/docs/getting-started`, `/docs/agent`, `/docs/gui`
and `/docs/about` are now group pages. Links such as `/docs/apps#cli-app-reverb` are sent to the new
page (`/docs/reverb#cli-app-reverb`) by `assets/js/docs.js` using `assets/js/docs-anchors.js`.
`/docs/advanced` is a `noindex` page that does the same and otherwise goes to `/docs/api`.
