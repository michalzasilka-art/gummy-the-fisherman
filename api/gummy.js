const { put, get } = require('@vercel/blob');

// Gummy the FisherMan fish index (which fish the account has caught, how often, heaviest),
// stored as one private JSON blob. The middleware only lets signed-in requests reach /api/.
const DATA_PATH = 'gummy/fish-index.json';
let memory = null; // local-dev fallback when no Blob store is configured

async function load() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL) return memory || {};
  try {
    const result = await get(DATA_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return {};
    const chunks = [];
    for await (const chunk of result.stream) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return {};
  }
}

async function save(index) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL) { memory = index; return; }
  await put(DATA_PATH, JSON.stringify(index), {
    access: 'private', contentType: 'application/json', allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  if (req.method === 'GET') return res.status(200).json({ fish: await load() });

  if (req.method === 'POST') {
    // one or more catches: { catches: [{ name, kg, at }] }
    const list = Array.isArray(body.catches) ? body.catches.slice(0, 50) : [];
    const index = await load();
    for (const c of list) {
      const name = String((c && c.name) || '').trim().slice(0, 40);
      if (!name) continue;
      const kg = Number(c.kg) > 0 ? Math.round(Number(c.kg) * 1000) / 1000 : 0;
      const at = Number(c.at) > 0 ? Number(c.at) : Date.now();
      const e = index[name] || { n: 0, best: 0, first: at };
      e.n += 1; e.best = Math.max(e.best, kg); e.first = Math.min(e.first, at);
      index[name] = e;
    }
    if (list.length) await save(index);
    return res.status(200).json({ fish: index });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
