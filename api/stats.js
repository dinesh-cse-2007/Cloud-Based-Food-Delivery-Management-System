import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { count: activeOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY']);
    const { count: merchantCount } = await supabase.from('merchants').select('*', { count: 'exact', head: true });
    const { count: dishCount } = await supabase.from('dishes').select('*', { count: 'exact', head: true });
    const { count: ridersOnline } = await supabase.from('riders').select('*', { count: 'exact', head: true }).eq('is_online', true);
    const { count: riderCount } = await supabase.from('riders').select('*', { count: 'exact', head: true });
    const { count: deliveryCount } = await supabase.from('deliveries').select('*', { count: 'exact', head: true });
    const { count: paymentCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });
    const { count: reviewCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
    const { count: itemCount } = await supabase.from('order_items').select('*', { count: 'exact', head: true });
    const { data: delivered } = await supabase.from('orders').select('total_cents').eq('status', 'DELIVERED');
    const { data: recent } = await supabase.from('orders').select('id, code, status, total_cents, customer_name, placed_at').order('placed_at', { ascending: false }).limit(6);
    const revenue = (delivered || []).reduce((s, o) => s + (o.total_cents || 0), 0);
    const avg = delivered && delivered.length ? Math.round(revenue / delivered.length) : 0;
    return res.status(200).json({
      totalOrders: totalOrders || 0, activeOrders: activeOrders || 0,
      merchantCount: merchantCount || 0, dishCount: dishCount || 0,
      ridersOnline: ridersOnline || 0, riderCount: riderCount || 0,
      deliveryCount: deliveryCount || 0, paymentCount: paymentCount || 0,
      reviewCount: reviewCount || 0, itemCount: itemCount || 0,
      revenueCents: revenue, avgOrderCents: avg, deliveredCount: (delivered || []).length,
      recent: recent || [],
    });
  } catch (err) { console.error('stats API error:', err); return res.status(500).json({ error: err.message }); }
}
