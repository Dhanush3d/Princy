// Serverless API route — reads/writes the tracker's data to Vercel's
// connected Upstash Redis database. Credentials come from env vars that
// Vercel sets automatically when you connect the database (Storage tab).
// The frontend never sees these — it only talks to /api/data.
//
// NOTE: when the same Upstash store is connected to more than one Vercel
// project, Vercel prefixes the env var names with the project name
// (e.g. "princy_KV_REST_API_URL") to avoid collisions. This checks the
// prefixed name first and falls back to the plain name, so it works
// either way without you having to remember which one applies.
const KEY = 'move-tracker-data';

function getEnv(...names) {
  for (const n of names) {
    if (process.env[n]) return process.env[n];
  }
  return null;
}

export default async function handler(req, res) {
  const KV_URL = getEnv('princy_KV_REST_API_URL', 'KV_REST_API_URL', 'princy_REDIS_URL');
  const KV_TOKEN = getEnv('princy_KV_REST_API_TOKEN', 'KV_REST_API_TOKEN');

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({
      error: 'No database connected. In Vercel: Storage tab -> Create Database -> Upstash Redis -> Connect to this project, then redeploy.'
    });
  }

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${KV_URL}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const json = await r.json();
      let value = null;
      if (json.result) {
        try { value = JSON.parse(json.result); } catch (e) { value = null; }
      }
      return res.status(200).json({ data: value });
    } catch (e) {
      return res.status(500).json({ error: 'read failed' });
    }
  }

  if (req.method === 'POST') {
    try {
      const value = JSON.stringify(req.body);
      const r = await fetch(`${KV_URL}/set/${KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        body: value
      });
      if (!r.ok) return res.status(500).json({ error: 'write failed' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'write failed' });
    }
  }

  res.status(405).json({ error: 'method not allowed' });
}
