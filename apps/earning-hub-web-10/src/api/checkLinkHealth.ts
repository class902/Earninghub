import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';

export default createEndpoint({
  description: 'Deep check offer links server-side — fetches HTML and detects campaign expired keywords',
  inputSchema: z.object({
    password: z.string(),
    urls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
    })),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      id: z.string(),
      status: z.enum(['live', 'expired', 'broken', 'timeout', 'error']),
      httpStatus: z.number().optional(),
      responseTime: z.number(),
      detectedKeywords: z.array(z.string()),
      pageTitle: z.string().optional(),
      ogImage: z.string().optional(),
      ogDescription: z.string().optional(),
      checkedAt: z.string(),
    })),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) throw new Error('Invalid password');

    const EXPIRED_KEYWORDS = [
      'campaign over', 'campaign ended', 'offer expired', 'offer closed',
      'thank you for participating', 'campaign is over', 'no longer available',
      'offer has ended', 'campaign has ended', 'this offer is closed',
      'campaign completed', 'offer is no longer', 'deal expired',
      'promotion ended', 'promotion has ended', 'link expired',
      'this link is no longer', 'page not found', 'sorry, this page',
    ];

    const results = await Promise.allSettled(
      input.urls.map(async (item) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          const resp = await fetch(item.url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });
          clearTimeout(timeout);
          const responseTime = Date.now() - start;

          if (resp.status === 404 || resp.status === 410) {
            return {
              id: item.id, status: 'broken' as const, httpStatus: resp.status,
              responseTime, detectedKeywords: [], checkedAt: new Date().toISOString(),
            };
          }

          const html = await resp.text();
          const lowerHtml = html.toLowerCase();

          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim().slice(0, 120) : undefined;

          // Extract og:image and og:description meta tags
          const ogImageMatch = html.match(/<meta\s+(?:[^>]*?)(?:property|name)=["']og:image["'][^>]*?content=["']([^"']+)["']/i)
            || html.match(/<meta\s+(?:[^>]*?)content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:image["']/i);
          const ogImage = ogImageMatch ? ogImageMatch[1].trim().slice(0, 500) : undefined;
          const ogDescMatch = html.match(/<meta\s+(?:[^>]*?)(?:property|name)=["']og:description["'][^>]*?content=["']([^"']+)["']/i)
            || html.match(/<meta\s+(?:[^>]*?)content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:description["']/i);
          const ogDescription = ogDescMatch ? ogDescMatch[1].trim().slice(0, 200) : undefined;

          const detected = EXPIRED_KEYWORDS.filter(kw => lowerHtml.includes(kw));

          const status: 'expired' | 'live' | 'broken' = detected.length > 0
            ? 'expired'
            : (resp.status >= 200 && resp.status < 400 ? 'live' : 'broken');

          return {
            id: item.id, status, httpStatus: resp.status, responseTime,
            detectedKeywords: detected, pageTitle, ogImage, ogDescription, checkedAt: new Date().toISOString(),
          };
        } catch (e) {
          const responseTime = Date.now() - start;
          const isAbort = (e as Error).name === 'AbortError';
          return {
            id: item.id, status: (isAbort ? 'timeout' : 'error') as 'timeout' | 'error',
            responseTime, detectedKeywords: [], checkedAt: new Date().toISOString(),
          };
        }
      })
    );

    return {
      results: results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        return {
          id: input.urls[i].id, status: 'error' as const,
          responseTime: 0, detectedKeywords: [], checkedAt: new Date().toISOString(),
        };
      }),
    };
  },
});
