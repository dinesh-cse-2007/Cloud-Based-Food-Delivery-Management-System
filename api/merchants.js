import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { id, active } = req.query;
      let q = supabase.from('merchants').select('*').order('rating', { ascending: false });
      if (id) q = q.eq('id', id);
      if (active === 'true') q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(id ? data[0] || null : data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.name || !b.cuisine) return res.status(400).json({ error: 'name and cuisine are required' });
      const { data, error } = await supabase.from('merchants').insert({
        name: b.name, cuisine: b.cuisine, description: b.description || '', image_url: b.image_url || '',
        delivery_fee_cents: b.delivery_fee_cents ?? 299, min_order_cents: b.min_order_cents ?? 0,
        eta_min: b.eta_min ?? 20, eta_max: b.eta_max ?? 35, zone: b.zone || 'downtown',
        commission_bps: b.commission_bps ?? 1500, rating: 5.0, is_active: true,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...patch } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('merchants').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await supabase.from('merchants').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('merchants API error:', err); return res.status(500).json({ error: err.message }); }
}
