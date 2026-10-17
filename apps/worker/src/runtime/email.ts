import { ApiError } from './backend';
import { runtime } from './context';

export type EmailBlock =
  | { type: 'text'; content: string }
  | { type: 'button'; label: string; href: string; alignment?: 'left' | 'center' | 'right' }
  | { type: 'image'; src: string; alt?: string; alignment?: 'left' | 'center' | 'right'; width: number; height: number }
  | { type: 'spacer'; height: number }
  | { type: 'divider'; borderColor?: string };

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: EmailBlock[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape everything, then re-allow a tiny set of inline tags used in our templates. */
function textToHtml(s: string): string {
  return esc(s)
    .replace(/&lt;(\/?)(strong|b|em|i|br)\s*\/?&gt;/g, '<$1$2>')
    .replace(/\n/g, '<br>');
}

function render(blocks: EmailBlock[]): string {
  const parts = blocks.map((b) => {
    switch (b.type) {
      case 'text':
        return `<p style="margin:0 0 14px;line-height:1.6;color:#1f2937">${textToHtml(b.content)}</p>`;
      case 'button':
        return `<p style="text-align:${b.alignment ?? 'left'};margin:18px 0"><a href="${esc(b.href)}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">${esc(b.label)}</a></p>`;
      case 'image':
        return `<p style="text-align:${b.alignment ?? 'left'}"><img src="${esc(b.src)}" alt="${esc(b.alt ?? '')}" width="${b.width}" height="${b.height}"></p>`;
      case 'spacer':
        return `<div style="height:${b.height}px"></div>`;
      case 'divider':
        return `<hr style="border:0;border-top:1px solid ${esc(b.borderColor ?? '#e5e7eb')};margin:18px 0">`;
    }
  });
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">${parts.join('')}</div>`;
}

export const Email = {
  /** Sends via Resend (https://resend.com). Requires the RESEND_API_KEY secret. */
  async send(params: SendEmailParams): Promise<{ success: boolean }> {
    const { RESEND_API_KEY, MAIL_FROM } = runtime().env;
    if (!RESEND_API_KEY) {
      throw new ApiError({ code: 'INTERNAL_ERROR', message: 'Email is not configured (RESEND_API_KEY is missing).' });
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM || 'EarningHub <onboarding@resend.dev>',
        to: Array.isArray(params.to) ? params.to : [params.to],
        cc: params.cc,
        bcc: params.bcc,
        reply_to: params.replyTo,
        subject: params.subject,
        html: render(params.body),
      }),
    });
    if (!res.ok) {
      throw new ApiError({ code: 'INTERNAL_ERROR', message: `Email provider rejected the request (HTTP ${res.status}).` });
    }
    return { success: true };
  },
};
