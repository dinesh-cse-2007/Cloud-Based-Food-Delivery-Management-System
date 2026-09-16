import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, ShoppingBag, Bike, Store, ArrowRight, Star, Ban } from 'lucide-react';
import { apiGet, apiSend, money, statusColor, timeAgo } from '../lib/api';
import type { Merchant, Order, Review, Rider, Stats } from '../lib/types';

const NEXT: Record<string, { label: string; status: string } | null> = {
  PLACED: { label: 'Confirm', status: 'CONFIRMED' },
  CONFIRMED: { label: 'Start preparing', status: 'PREPARING' },
  PREPARING: { label: 'Dispatch courier', status: 'OUT_FOR_DELIVERY' },
  OUT_FOR_DELIVERY: { label: 'Mark delivered', status: 'DELIVERED' },
  DELIVERED: null,
  CANCELLED: null,
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      const [s, o, m, r, v] = await Promise.all([
        apiGet<Stats>('/api/stats'),
        apiGet<Order[]>('/api/orders?limit=30'),
        apiGet<Merchant[]>('/api/merchants'),
        apiGet<Rider[]>('/api/riders'),
        apiGet<Review[]>('/api/reviews?limit=6'),
      ]);
      setStats(s); setOrders(o); setMerchants(m); setRiders(r); setReviews(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const advance = async (o: Order, status: string) => {
    setBusy(o.id);
    try {
      await apiSend('/api/orders', 'PUT', { id: o.id, status });
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink/60"><Loader2 className="animate-spin" /> Opening the control room...</div>;

  const cards = [
    { icon: TrendingUp, label: 'Captured revenue', value: money(stats?.revenueCents || 0), sub: `${stats?.deliveredCount || 0} delivered orders` },
    { icon: ShoppingBag, label: 'Active orders', value: String(stats?.activeOrders || 0), sub: `${stats?.totalOrders || 0} all time` },
    { icon: Store, label: 'Kitchens', value: String(stats?.merchantCount || 0), sub: `${stats?.dishCount || 0} dishes live` },
    { icon: Bike, label: 'Riders online', value: String(stats?.ridersOnline || 0), sub: `${stats?.riderCount || 0} in fleet` },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8">
      <div className="pb-8 pt-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-ember">Live app · Admin surface</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.03em]">The control room.</h1>
      </div>
      {error && <p className="mb-5 rounded-2xl bg-red-500/10 px-5 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-[26px] border border-line bg-paper p-6 card-soft">
            <c.icon size={20} className="text-ember" />
            <p className="mt-4 font-serif text-4xl tracking-tight">{c.value}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">{c.label}</p>
            <p className="mt-1 font-mono text-xs text-ink/40">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Order pipeline</h3>
            <span className="font-mono text-xs text-ink/40">avg ticket {money(stats?.avgOrderCents || 0)}</span>
          </div>
          <div className="mt-5 space-y-3">
            {orders.map((o) => {
              const next = NEXT[o.status];
              return (
                <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-cream p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-ember">{o.code} <span className="text-ink/40">· {timeAgo(o.placed_at)}</span></p>
                    <p className="truncate text-sm font-semibold">{o.customer_name} <span className="font-normal text-ink/50">· {o.merchants?.name} · {money(o.total_cents)}</span></p>
                  </div>
                  <span className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span>
                  <div className="flex gap-2">
                    <Link to={`/track/${o.code}`} className="rounded-full border border-line px-4 py-2 font-mono text-xs transition hover:border-ember">View</Link>
                    {next && (
                      <button disabled={busy === o.id} onClick={() => advance(o, next.status)} className="flex items-center gap-1 rounded-full bg-ink px-4 py-2 font-mono text-xs text-cream transition hover:bg-ember disabled:opacity-50">
                        {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />} {next.label}
                      </button>
                    )}
                    {(o.status === 'PLACED' || o.status === 'CONFIRMED') && (
                      <button disabled={busy === o.id} onClick={() => advance(o, 'CANCELLED')} className="flex items-center gap-1 rounded-full border border-red-300 px-4 py-2 font-mono text-xs text-red-600 transition hover:bg-red-50"><Ban size={12} /> Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Fleet</h3>
            <div className="mt-5 space-y-3">
              {riders.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream p-4">
                  <div>
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">{r.vehicle_class} · {r.deliveries_count} trips · heat {r.heat_score}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] ${r.is_online ? 'bg-moss/10 text-moss' : 'bg-ink/5 text-ink/40'}`}><span className={`h-1.5 w-1.5 rounded-full ${r.is_online ? 'bg-emerald-500' : 'bg-ink/30'}`} />{r.is_online ? 'online' : 'off'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Kitchens</h3>
            <div className="mt-5 space-y-3">
              {merchants.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                  <img src={m.image_url || '/images/ramen.jpg'} alt={m.name} className="h-12 w-12 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="font-mono text-[11px] text-ink/50">{m.cuisine} · fee {money(m.delivery_fee_cents)} · {m.commission_bps / 100}%</p>
                  </div>
                  <span className="flex items-center gap-1 font-mono text-xs"><Star size={12} className="fill-saffron text-saffron" />{Number(m.rating).toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Latest reviews</h3>
            <div className="mt-5 space-y-3">
              {reviews.length === 0 && <p className="text-sm text-ink/50">No reviews yet.</p>}
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl bg-cream p-4">
                  <p className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={12} className={s <= r.stars ? 'fill-saffron text-saffron' : 'text-ink/20'} />)}<span className="ml-2 font-mono text-[11px] text-ink/50">{r.merchants?.name} · {r.orders?.code}</span></p>
                  {r.body && <p className="mt-2 text-sm text-ink/70">"{r.body}"</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
