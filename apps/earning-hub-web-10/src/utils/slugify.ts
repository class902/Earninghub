/**
 * Converts an offer title to a clean URL slug.
 * e.g. "SBI Credit Card" → "sbi-credit-card"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars
    .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphens
    .replace(/--+/g, '-')       // collapse multiple hyphens
    .replace(/^-|-$/g, '');     // trim leading/trailing hyphens
}

/** Find an offer whose slugified name matches the given slug */
export function findOfferBySlug<T extends { name: string }>(offers: T[], slug: string): T | undefined {
  return offers.find(o => slugify(o.name) === slug);
}
