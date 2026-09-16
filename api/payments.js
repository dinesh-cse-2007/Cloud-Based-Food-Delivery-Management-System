import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { order_id } = req.query;
      let q = supabase.from('payments').select('*').order('id', { ascending: false });
      if (order_id) q = q.eq('order_id', order_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.order_id || b.amount_cents == null) return res.status(400).json({ error: 'order_id and amount_cents are required' });
      const { data, error } = await supabase.from('payments').insert({
        order_id: b.order_id, amount_cents: b.amount_cents, method: b.method || 'card', status: 'pending',
        stripe_ref: b.stripe_ref || 'pi_' + Math.random().toString(36).slice(2, 12), captured: false,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: 'id and status are required' });
      const { data, error } = await supabase.from('payments').update({ status, captured: status === 'captured' }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('payments API error:', err); return res.status(500).json({ error: err.message }); }
}
