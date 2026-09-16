import { useEffect, useState } from 'react';
import { Bike, Loader2, MapPin, Clock, Package, CheckCircle2, CircleDot, Phone } from 'lucide-react';
import { apiGet, apiSend, money, timeAgo } from '../lib/api';
import type { Delivery, Rider } from '../lib/types';

type Tab = 'queued' | 'mine' | 'done';

export default function CourierPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riderId, setRiderId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('queued');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proof, setProof] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      const [r, d] = await Promise.all([apiGet<Rider[]>('/api/riders'), apiGet<Delivery[]>('/api/deliveries')]);
      setRiders(r);
      setDeliveries(d);
      if (riderId === null && r.length) setRiderId(r.find((x) => x.is_online)?.id ?? r[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => fetchAll(), 8000);
    return () => clearInterval(t);
  }, [riderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const me = riders.find((r) => r.id === riderId);

  const act = async (d: Delivery, status: 'assigned' | 'picked_up' | 'delivered') => {
    if (!riderId) return;
    setBusy(d.id);
    try {
      await apiSend('/api/deliveries', 'PUT', { id: d.id, status, rider_id: riderId, proof_note: proof[d.id] || undefined });
      await fetchAll();
      if (status === 'assigned') setTab('mine');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const toggleOnline = async () => {
    if (!me) return;
    try {
      await apiSend('/api/riders', 'PUT', { id: me.id, is_online: !me.is_online });
      fetchAll();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  const queued = deliveries.filter((d) => d.status === 'queued');
  const mine = deliveries.filter((d) => d.rider_id === riderId && (d.status === 'assigned' || d.status === 'picked_up'));
  const done = deliveries.filter((d) => d.status === 'delivered' || d.status === 'cancelled');
  const shown = tab === 'queued' ? queued : tab === 'mine' ? mine : done;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink/60"><Loader2 className="animate-spin" /> Contacting the fleet...</div>;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-8 pt-8">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-ember">Live app · Courier surface · refreshes every 8s</p>
          <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.03em]">The dispatch board.</h1>
        </div>
        {me && (
          <button onClick={toggleOnline} className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${me.is_online ? 'bg-moss text-cream' : 'border border-line bg-paper text-ink/60'}`}>
            <span className={`h-2 w-2 rounded-full ${me.is_online ? 'animate-pulse bg-emerald-300' : 'bg-ink/30'}`} /> {me.is_online ? 'You are online' : 'You are offline'}
          </button>
        )}
      </div>

      {error && <p className="mb-5 rounded-2xl bg-red-500/10 px-5 py-3 text-sm text-red-700">{error}</p>}

      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ink/50">Riding as</p>
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
        {riders.map((r) => (
          <button key={r.id} onClick={() => setRiderId(r.id)} className={`flex shrink-0 items-center gap-3 rounded-[22px] border p-4 pr-6 text-left transition ${riderId === r.id ? 'border-ember bg-paper card-soft' : 'border-line bg-paper/60 hover:border-ember/50'}`}>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${riderId === r.id ? 'bg-ember text-white' : 'bg-ink/5 text-ink/60'}`}><Bike size={20} /></div>
            <span>
              <span className="block text-sm font-semibold">{r.name} {r.is_online && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />}</span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">{r.vehicle_class} · heat {r.heat_score} · {r.deliveries_count} trips</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        {([['queued', `Available (${queued.length})`], ['mine', `My runs (${mine.length})`], ['done', `History (${done.length})`]] as Array<[Tab, string]>).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-3 text-sm font-semibold transition ${tab === t ? 'bg-ink text-cream' : 'border border-line bg-paper text-ink/60 hover:border-ember/50'}`}>{label}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.length === 0 && <p className="rounded-[26px] border border-dashed border-line bg-paper/60 p-10 text-center font-serif text-2xl italic text-ink/40">Nothing here — the city is quiet.</p>}
        {shown.map((d) => {
          const o = d.orders;
          return (
            <article key={d.id} className="flex flex-col rounded-[26px] border border-line bg-paper p-6 card-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-ember">{o?.code}</p>
                  <h3 className="mt-2 font-serif text-2xl leading-tight">{o?.customer_name}</h3>
                </div>
                <span className="rounded-full bg-ink/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink/60">{d.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-ink/60"><MapPin size={14} className="mt-1 shrink-0" /> {o?.customer_address}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-ink/50">
                <span className="flex items-center gap-1"><Package size={12} /> {money(o?.total_cents || 0)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> ETA {o?.eta_minutes}m</span>
                {o?.customer_phone && <span className="flex items-center gap-1"><Phone size={12} /> {o.customer_phone}</span>}
              </div>
              {d.riders && <p className="mt-2 font-mono text-xs text-ink/50">Rider: {d.riders.name} · {d.riders.vehicle_class}</p>}
              {d.status === 'picked_up' && (
                <input value={proof[d.id] || ''} onChange={(e) => setProof({ ...proof, [d.id]: e.target.value })} placeholder="Handoff proof note..." className="mt-4 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-ember" />
              )}
              <div className="mt-4 flex gap-2 pt-1">
                {d.status === 'queued' && (
                  <button disabled={busy === d.id} onClick={() => act(d, 'assigned')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ember py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50">
                    {busy === d.id ? <Loader2 size={15} className="animate-spin" /> : <CircleDot size={15} />} Accept run
                  </button>
                )}
                {d.status === 'assigned' && d.rider_id === riderId && (
                  <button disabled={busy === d.id} onClick={() => act(d, 'picked_up')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-cream transition hover:-translate-y-0.5 disabled:opacity-50">
                    {busy === d.id ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />} Mark picked up
                  </button>
                )}
                {d.status === 'picked_up' && d.rider_id === riderId && (
                  <button disabled={busy === d.id} onClick={() => act(d, 'delivered')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-moss py-3 text-sm font-semibold text-cream transition hover:-translate-y-0.5 disabled:opacity-50">
                    {busy === d.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Confirm handoff
                  </button>
                )}
                {(d.status === 'delivered' || d.status === 'cancelled') && (
                  <p className="font-mono text-xs text-ink/50">{d.handoff_at ? 'Handed off ' + timeAgo(d.handoff_at) : d.status}{d.proof_note ? ` · "${d.proof_note}"` : ''}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-[26px] border border-line bg-deep p-6 text-sm leading-6 text-[#B9C4BB] md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-saffron">How dispatch works</p>
        <p className="mt-2">Assignment writes a 30-minute TTL lease on the delivery row; pickup flips the order to OUT_FOR_DELIVERY; handoff captures payment and increments the rider trip count — all enforced by the deliveries API.</p>
      </div>
    </div>
  );
}
