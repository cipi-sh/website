/**
 * Enforce canonical origin: https://cipi.sh (apex, no www).
 * Cloudflare Pages _redirects cannot do host/protocol redirects.
 */
const CANONICAL_HOST = 'cipi.sh';

export function onRequest(context) {
  const url = new URL(context.request.url);

  // Preview / default *.pages.dev hostnames — do not rewrite
  if (url.hostname.endsWith('.pages.dev')) {
    return context.next();
  }

  const needsHttps = url.protocol === 'http:';
  const needsApex = url.hostname === `www.${CANONICAL_HOST}`;

  if (!needsHttps && !needsApex) {
    return context.next();
  }

  url.protocol = 'https:';
  url.hostname = CANONICAL_HOST;

  return Response.redirect(url.toString(), 301);
}
