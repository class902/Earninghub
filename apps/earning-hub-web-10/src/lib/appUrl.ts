/**
 * Base-path aware URL helpers.
 *
 * The app can be served from a domain root (https://example.com/) or from a
 * sub-path such as GitHub Pages project sites (https://user.github.io/Repo/).
 * Vite exposes the configured `base` as `import.meta.env.BASE_URL`; these
 * helpers make every generated / shared link respect it. With base "/" they
 * are a no-op, so behaviour on a root domain is unchanged.
 */
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, ''); // '' or '/Repo'

/** Router basename: undefined for root hosting, '/Repo' for sub-path hosting. */
export const routerBasename: string | undefined = BASE || undefined;

/** Prefix an in-app path ('/offers') with the base path. Absolute URLs, '#anchors' and mailto:/tel: are returned untouched. */
export function appPath(path: string = '/'): string {
  if (!path) return `${BASE}/`;
  if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (BASE && (p === BASE || p.startsWith(`${BASE}/`))) return p;
  return `${BASE}${p}`;
}

/** Public origin of the app including the base path, without trailing slash (use instead of window.location.origin). */
export function appOrigin(): string {
  return typeof window === 'undefined' ? '' : `${window.location.origin}${BASE}`;
}
