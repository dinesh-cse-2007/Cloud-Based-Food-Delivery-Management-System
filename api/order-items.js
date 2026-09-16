import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { order_id } = req.query;
      let q = supabase.from('order_items').select('*, dishes(*)').order('id', { ascending: true });
      if (order_id) q = q.eq('order_id', order_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.order_id || !b.dish_id || !b.qty) return res.status(400).json({ error: 'order_id, dish_id and qty are required' });
      const { data, error } = await supabase.from('order_items').insert({ order_id: b.order_id, dish_id: b.dish_id, dish_name: b.dish_name, unit_price_cents: b.unit_price_cents, qty: b.qty, notes: b.notes || '' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('order-items API error:', err); return res.status(500).json({ error: err.message }); }
}
