import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { status, rider_id, order_id } = req.query;
      let q = supabase.from('deliveries').select('*, orders(*), riders(*)').order('id', { ascending: false });
      if (status) q = q.eq('status', status);
      if (rider_id) q = q.eq('rider_id', rider_id);
      if (order_id) q = q.eq('order_id', order_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { order_id } = req.body;
      if (!order_id) return res.status(400).json({ error: 'order_id is required' });
      const { data, error } = await supabase.from('deliveries').insert({ order_id, status: 'queued' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, status, rider_id, proof_note } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const patch = {};
      if (status) patch.status = status;
      if (rider_id) patch.rider_id = rider_id;
      if (proof_note != null) patch.proof_note = proof_note;
      if (status === 'assigned') patch.lease_expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      if (status === 'picked_up') patch.picked_up_at = new Date().toISOString();
      if (status === 'delivered') patch.handoff_at = new Date().toISOString();
      const { data, error } = await supabase.from('deliveries').update(patch).eq('id', id).select('*, orders(*)').single();
      if (error) throw error;
      const orderId = data.order_id;
      if (status === 'assigned') await supabase.from('orders').update({ status: 'CONFIRMED', updated_at: new Date().toISOString() }).eq('id', orderId);
      if (status === 'picked_up') await supabase.from('orders').update({ status: 'OUT_FOR_DELIVERY', updated_at: new Date().toISOString() }).eq('id', orderId);
      if (status === 'delivered') {
        await supabase.from('orders').update({ status: 'DELIVERED', payment_status: 'captured', updated_at: new Date().toISOString() }).eq('id', orderId);
        await supabase.from('payments').update({ status: 'captured', captured: true }).eq('order_id', orderId);
        if (data.rider_id) {
          const { data: rider } = await supabase.from('riders').select('deliveries_count').eq('id', data.rider_id).single();
          if (rider) await supabase.from('riders').update({ deliveries_count: (rider.deliveries_count || 0) + 1 }).eq('id', data.rider_id);
        }
      }
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('deliveries API error:', err); return res.status(500).json({ error: err.message }); }
}
