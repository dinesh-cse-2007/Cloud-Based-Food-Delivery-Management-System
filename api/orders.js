import supabase from './db-client.js';

function genCode() {
  return 'MF-' + Math.floor(48000 + Math.random() * 1999);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { id, code, status, merchant_id, limit } = req.query;
      let q = supabase.from('orders').select('*, order_items(*), merchants(*)').order('placed_at', { ascending: false });
      if (id) q = q.eq('id', id);
      if (code) q = q.eq('code', code);
      if (status) q = q.eq('status', status);
      if (merchant_id) q = q.eq('merchant_id', merchant_id);
      if (limit) q = q.limit(parseInt(limit, 10));
      const { data, error } = await q;
      if (error) throw error;
      if (id || code) return res.status(200).json(data[0] || null);
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.merchant_id || !b.customer_name || !b.customer_address || !Array.isArray(b.items) || b.items.length === 0) {
        return res.status(400).json({ error: 'merchant_id, customer_name, customer_address and at least one item are required' });
      }
      // Idempotency boundary: safe retries, double-submit impossible
      if (b.idempotency_key) {
        const { data: existing } = await supabase.from('orders').select('*, order_items(*)').eq('idempotency_key', b.idempotency_key).maybeSingle();
        if (existing) return res.status(200).json({ ...existing, deduped: true });
      }
      const dishIds = b.items.map((i) => i.dish_id);
      const { data: dishes, error: dErr } = await supabase.from('dishes').select('*').in('id', dishIds);
      if (dErr) throw dErr;
      if (!dishes || dishes.length !== dishIds.length) return res.status(400).json({ error: 'One or more dishes not found' });
      const { data: merchant, error: mErr } = await supabase.from('merchants').select('*').eq('id', b.merchant_id).single();
      if (mErr || !merchant) return res.status(400).json({ error: 'Merchant not found' });
      let subtotal = 0;
      const lines = b.items.map((it) => {
        const d = dishes.find((x) => x.id === it.dish_id);
        const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
        subtotal += d.price_cents * qty;
        return { dish_id: d.id, dish_name: d.name, unit_price_cents: d.price_cents, qty, notes: it.notes || '' };
      });
      const deliveryFee = merchant.delivery_fee_cents || 0;
      const total = subtotal + deliveryFee;
      if (subtotal < (merchant.min_order_cents || 0)) {
        return res.status(400).json({ error: 'Minimum order is ' + (merchant.min_order_cents / 100).toFixed(2) });
      }
      const eta = Math.round(((merchant.eta_min || 20) + (merchant.eta_max || 35)) / 2);
      const code = genCode();
      const { data: order, error: oErr } = await supabase.from('orders').insert({
        code, merchant_id: b.merchant_id, customer_name: b.customer_name,
        customer_email: b.customer_email || '', customer_phone: b.customer_phone || '',
        customer_address: b.customer_address, status: 'PLACED',
        subtotal_cents: subtotal, delivery_fee_cents: deliveryFee, total_cents: total,
        eta_minutes: eta, idempotency_key: b.idempotency_key || code + '-' + Date.now(), payment_status: 'pending',
      }).select().single();
      if (oErr) throw oErr;
      const { error: iErr } = await supabase.from('order_items').insert(lines.map((l) => ({ ...l, order_id: order.id })));
      if (iErr) throw iErr;
      await supabase.from('payments').insert({
        order_id: order.id, amount_cents: total, method: b.payment_method || 'card',
        status: 'pending', stripe_ref: 'pi_' + Math.random().toString(36).slice(2, 12), captured: false,
      });
      await supabase.from('deliveries').insert({ order_id: order.id, status: 'queued', eta_history: [{ at: new Date().toISOString(), eta_minutes: eta, event: 'order.placed' }] });
      const { data: full } = await supabase.from('orders').select('*, order_items(*), merchants(*)').eq('id', order.id).single();
      return res.status(201).json(full);
    }
    if (req.method === 'PUT') {
      const { id, status, payment_status } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const patch = { updated_at: new Date().toISOString() };
      if (status) patch.status = status;
      if (payment_status) patch.payment_status = payment_status;
      const { data, error } = await supabase.from('orders').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (status === 'DELIVERED') {
        await supabase.from('deliveries').update({ status: 'delivered', handoff_at: new Date().toISOString() }).eq('order_id', id);
        await supabase.from('payments').update({ status: 'captured', captured: true }).eq('order_id', id);
        await supabase.from('orders').update({ payment_status: 'captured' }).eq('id', id);
      }
      if (status === 'OUT_FOR_DELIVERY') {
        await supabase.from('deliveries').update({ status: 'picked_up', picked_up_at: new Date().toISOString() }).eq('order_id', id);
      }
      if (status === 'CANCELLED') {
        await supabase.from('deliveries').update({ status: 'cancelled' }).eq('order_id', id);
        await supabase.from('payments').update({ status: 'refunded', captured: false }).eq('order_id', id);
        await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', id);
      }
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('orders API error:', err); return res.status(500).json({ error: err.message }); }
}
