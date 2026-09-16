import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { merchant_id, order_id, limit } = req.query;
      let q = supabase.from('reviews').select('*, merchants(*), orders(*)').order('created_at', { ascending: false });
      if (merchant_id) q = q.eq('merchant_id', merchant_id);
      if (order_id) q = q.eq('order_id', order_id);
      if (limit) q = q.limit(parseInt(limit, 10));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.order_id || !b.merchant_id || !b.stars) return res.status(400).json({ error: 'order_id, merchant_id and stars are required' });
      if (b.stars < 1 || b.stars > 5) return res.status(400).json({ error: 'stars must be between 1 and 5' });
      const { data, error } = await supabase.from('reviews').insert({ order_id: b.order_id, merchant_id: b.merchant_id, stars: b.stars, body: b.body || '' }).select().single();
      if (error) throw error;
      const { data: all } = await supabase.from('reviews').select('stars').eq('merchant_id', b.merchant_id);
      if (all && all.length) {
        const avg = all.reduce((s, r) => s + r.stars, 0) / all.length;
        await supabase.from('merchants').update({ rating: Math.round(avg * 10) / 10 }).eq('id', b.merchant_id);
      }
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, response } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('reviews').update({ response }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('reviews API error:', err); return res.status(500).json({ error: err.message }); }
}
