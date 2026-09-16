import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { merchant_id, id, limit } = req.query;
      let q = supabase.from('dishes').select('*, merchants(*)').order('id', { ascending: true });
      if (merchant_id) q = q.eq('merchant_id', merchant_id);
      if (id) q = q.eq('id', id);
      if (limit) q = q.limit(parseInt(limit, 10));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(id ? data[0] || null : data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.merchant_id || !b.name || b.price_cents == null) return res.status(400).json({ error: 'merchant_id, name and price_cents are required' });
      const { data, error } = await supabase.from('dishes').insert({
        merchant_id: b.merchant_id, name: b.name, description: b.description || '',
        price_cents: b.price_cents, cost_cents: b.cost_cents ?? 0, image_url: b.image_url || '',
        category: b.category || 'Mains', prep_minutes: b.prep_minutes ?? 15, is_available: true, is_seasonal: false,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...patch } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('dishes').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('dishes API error:', err); return res.status(500).json({ error: err.message }); }
}
