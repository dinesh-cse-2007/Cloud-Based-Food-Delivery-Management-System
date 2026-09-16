import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { id, online } = req.query;
      let q = supabase.from('riders').select('*').order('heat_score', { ascending: false });
      if (id) q = q.eq('id', id);
      if (online === 'true') q = q.eq('is_online', true);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(id ? data[0] || null : data);
    }
    if (req.method === 'POST') {
      const b = req.body;
      if (!b.name) return res.status(400).json({ error: 'name is required' });
      const { data, error } = await supabase.from('riders').insert({
        name: b.name, phone: b.phone || '', vehicle_class: b.vehicle_class || 'bike',
        kyc_level: b.kyc_level || 'basic', heat_score: 50, is_online: true, deliveries_count: 0,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...patch } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { data, error } = await supabase.from('riders').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('riders API error:', err); return res.status(500).json({ error: err.message }); }
}
