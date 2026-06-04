# cipi-website

Marketing site for [Cipi](https://cipi.sh/).

## Canonical URL

All pages use `https://cipi.sh` (apex, HTTPS, no `www`) in `<link rel="canonical">`, Open Graph, JSON-LD, `sitemap.xml`, and `robots.txt`.

HTTP and `www.cipi.sh` requests are redirected with **301** via `functions/_middleware.js` on Cloudflare Pages. Enable **Always Use HTTPS** in the Cloudflare SSL/TLS dashboard as well.

For `www` to reach Pages, add a proxied DNS record for `www` (see [Cloudflare www → apex](https://developers.cloudflare.com/pages/how-to/www-redirect/)).
