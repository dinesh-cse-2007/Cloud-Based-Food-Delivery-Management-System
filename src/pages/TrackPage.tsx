import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Loader2, Bike, Receipt, Star, Check, CreditCard, MapPin, Clock } from 'lucide-react';
import { apiGet, apiSend, money, ORDER_STEPS, statusColor, timeAgo } from '../lib/api';
import type { Delivery, Order, Payment, Review } from '../lib/types';

export default function TrackPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');

  const load = useCallback(async (c: string, silent = false) => {
    if (!c) return;
    if (!silent) { setLoading(true); setError(''); }
    try {
      const o = await apiGet<Order | null>(`/api/orders?code=${encodeURIComponent(c.trim())}`);
      if (!o) { setOrder(null); setError(`No order found for code "${c}".`); return; }
      setOrder(o);
      const [d, p, r] = await Promise.all([
        apiGet<Delivery[]>(`/api/deliveries?order_id=${o.id}`).catch(() => [] as Delivery[]),
        apiGet<Payment[]>(`/api/payments?order_id=${o.id}`).catch(() => [] as Payment[]),
        apiGet<Review[]>(`/api/reviews?order_id=${o.id}`).catch(() => [] as Review[]),
      ]);
      setDelivery(d[0] || null);
      setPayment(p[0] || null);
      setReviews(r);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let last = '';
    try { last = localStorage.getItem('mf_last_order') || ''; } catch { /* ignore */ }
    const target = code || last;
    if (target) { setInput(target); load(target); }
  }, [code, load]);

  useEffect(() => {
    if (!order || order.status === 'DELIVERED' || order.status === 'CANCELLED') return;
    const t = setInterval(() => load(order.code, true), 6000);
    return () => clearInterval(t);
  }, [order, load]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (input.trim()) { navigate(`/track/${input.trim()}`, { replace: true }); load(input.trim()); } };

  const submitReview = async () => {
    if (!order) return;
    setReviewMsg('');
    try {
      await apiSend('/api/reviews', 'POST', { order_id: order.id, merchant_id: order.merchant_id, stars, body });
      setReviewMsg('Thanks — review posted and merchant rating rolled up.');
      setBody('');
      const r = await apiGet<Review[]>(`/api/reviews?order_id=${order.id}`);
      setReviews(r);
    } catch (e) { setReviewMsg(e instanceof Error ? e.message : 'Could not post review'); }
  };

  const stepIndex = order ? ORDER_STEPS.findIndex((s) => s.key === order.status) : -1;
  const cancelled = order?.status === 'CANCELLED';

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 md:px-8">
      <div className="pb-8 pt-8 text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-ember">Live tracking · auto-refreshes every 6s</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-none tracking-[-0.03em]">Where is my food?</h1>
        <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md items-center gap-2 rounded-full border border-line bg-paper p-2 pl-5 card-soft">
          <Search size={16} className="shrink-0 text-ink/40" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Order code · e.g. MF-48210" className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-ink/40" />
          <button type="submit" className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">Track</button>
        </form>
      </div>

      {loading && <div className="flex items-center justify-center gap-3 py-16 text-ink/60"><Loader2 className="animate-spin" /> Locating your order...</div>}
      {error && !loading && <p className="mx-auto max-w-md rounded-2xl bg-red-500/10 px-5 py-4 text-center text-sm text-red-700">{error}</p>}

      {order && !loading && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[28px] p-6 card-soft md:p-10" style={{ background: 'linear-gradient(135deg,#1C2620,#2E4034)' }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-saffron">{order.code} · {order.merchants?.name}</p>
                <h2 className="mt-3 font-serif text-3xl tracking-tight text-cream md:text-4xl">{cancelled ? 'Order cancelled' : ORDER_STEPS[stepIndex]?.label || order.status}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#B9C4BB]">
                  <span className="flex items-center gap-1.5"><Clock size={12} /> ETA ~{order.eta_minutes} min</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} /> {order.customer_address}</span>
                  <span>Placed {timeAgo(order.placed_at)}</span>
                </p>
              </div>
              <span className={`rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${statusColor(order.status)} bg-paper`}>{order.status.replace(/_/g, ' ')}</span>
            </div>
            {!cancelled && (
              <div className="mt-8">
                <div className="flex items-center">
                  {ORDER_STEPS.map((s, i) => (
                    <div key={s.key} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-bold ${i <= stepIndex ? 'bg-saffron text-ink' : 'border border-white/20 text-white/40'}`}>{i < stepIndex ? <Check size={15} /> : i + 1}</div>
                        <span className={`hidden text-[11px] sm:block ${i <= stepIndex ? 'text-cream' : 'text-white/40'}`}>{s.label}</span>
                      </div>
                      {i < ORDER_STEPS.length - 1 && <div className={`mx-2 mb-0 h-0.5 flex-1 rounded sm:mb-6 ${i < stepIndex ? 'bg-saffron' : 'bg-white/15'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em]"><Receipt size={15} /> Receipt</h3>
              <ul className="mt-5 space-y-3">
                {(order.order_items || []).map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 text-sm last:border-0">
                    <span><span className="font-mono font-bold text-ember">{it.qty}x </span> {it.dish_name}</span>
                    <span className="font-mono">{money(it.unit_price_cents * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 font-mono text-[13px] text-ink/60">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(order.subtotal_cents)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{money(order.delivery_fee_cents)}</span></div>
                <div className="flex justify-between pt-2 font-serif text-2xl text-ink"><span>Total</span><span>{money(order.total_cents)}</span></div>
              </div>
              {payment && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 font-mono text-xs text-ink/60"><CreditCard size={13} /> {payment.method} · {payment.stripe_ref} · {payment.status}</p>}
            </div>
            <div className="flex flex-col gap-5">
              <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em]"><Bike size={15} /> Courier</h3>
                {delivery?.riders ? (
                  <div className="mt-5">
                    <p className="font-serif text-3xl">{delivery.riders.name}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-ink/50">{delivery.riders.vehicle_class} · {delivery.riders.deliveries_count} trips · delivery {delivery.status.replace('_', ' ')}</p>
                    {delivery.proof_note && <p className="mt-4 rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">"{delivery.proof_note}"</p>}
                    {delivery.handoff_at && <p className="mt-2 font-mono text-xs text-ink/50">Handed off {timeAgo(delivery.handoff_at)}</p>}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-ink/60">A rider is being matched to your zone. Queued deliveries appear on the <a href="/courier" className="font-semibold text-ember underline">courier board</a> in real time.</p>
                )}
              </div>
              <div className="rounded-[28px] border border-line bg-paper p-6 card-soft md:p-8">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em]"><Star size={15} /> Review</h3>
                {reviews.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-2xl bg-cream p-4">
                        <p className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className={s <= r.stars ? 'fill-saffron text-saffron' : 'text-ink/20'} />)}</p>
                        {r.body && <p className="mt-2 text-sm text-ink/70">"{r.body}"</p>}
                      </div>
                    ))}
                  </div>
                ) : order.status === 'DELIVERED' ? (
                  <div className="mt-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setStars(s)}><Star size={24} className={s <= stars ? 'fill-saffron text-saffron' : 'text-ink/20'} /></button>
                      ))}
                    </div>
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="How was it?" className="mt-3 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-ember" />
                    <button onClick={submitReview} className="mt-3 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">Post review</button>
                    {reviewMsg && <p className="mt-2 text-sm text-moss">{reviewMsg}</p>}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink/60">Reviews unlock once your order is delivered.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
