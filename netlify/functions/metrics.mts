import { sql, gte } from 'drizzle-orm';
import { database } from '../../db/index.js';
import { dailyMetrics } from '../../db/schema.js';

export default async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === 'POST') {
    if (req.headers.get('origin') !== url.origin) return new Response(null, { status: 403 });
    if (!req.headers.get('content-type')?.startsWith('application/json')) return new Response(null, { status: 415 });
    const bodyText = await req.text();
    if (bodyText.length > 256) return new Response(null, { status: 413 });
    let body;
    try { body = JSON.parse(bodyText); } catch { return new Response(null, { status: 400 }); }
    if (!body || typeof body !== 'object') return new Response(null, { status: 400 });
    const valid = body.metric === 'view' ? ['mobile', 'desktop'].includes(body.dimension) :
      body.metric === 'tool' && ['json', 'base64', 'qr', 'text'].includes(body.dimension);
    if (!valid) return new Response(null, { status: 400 });
    try {
      await database().insert(dailyMetrics).values({ day: new Date().toISOString().slice(0, 10), metric: body.metric, dimension: body.dimension, total: 1 })
        .onConflictDoUpdate({ target: [dailyMetrics.day, dailyMetrics.metric, dailyMetrics.dimension], set: { total: sql`${dailyMetrics.total} + 1` } });
      return new Response(null, { status: 204 });
    } catch { return Response.json({ error: 'Ölçüm kaydedilemedi.' }, { status: 503 }); }
  }
  if (req.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  const days = Number(url.searchParams.get('days') || 7);
  if (![7, 30, 90].includes(days)) return Response.json({ error: 'Geçersiz tarih aralığı.' }, { status: 400 });
  const start = new Date(); start.setUTCHours(0, 0, 0, 0); start.setUTCDate(start.getUTCDate() - days + 1);
  try {
    const rows = await database().select().from(dailyMetrics).where(gte(dailyMetrics.day, start.toISOString().slice(0, 10)));
    return Response.json({ rows, days, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'İstatistikler şu anda alınamıyor. Lütfen tekrar deneyin.' }, { status: 503 }); }
};
export const config = { path: '/api/metrics' };
