import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { apiGet, apiSend, money } from '../lib/api';
import type { Merchant, Order } from '../lib/types';

export default function CartDrawer({ merchants: propMerchants = [] }: { merchants?: Merchant[] }) {
  const { lines, merchantId, merchantName, subtotal, isOpen, setOpen, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<'cart' | 'details' | 'done'>('cart');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', method: 'card' });
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [fetched, setFetched] = useState<Merchant[]>([]);

  useEffect(() => {
    if (propMerchants.length === 0) {
      apiGet<Merchant[]>('/api/merchants').then(setFetched).catch(() => undefined);
    }
  }, [propMerchants.length, isOpen]);

  const merchants = propMerchants.length > 0 ? propMerchants : fetched;

  const merchant = merchants.find((m) => m.id === merchantId);
  const fee = merchant?.delivery_fee_cents ?? 0;
  const total = subtotal + fee;

  const close = () => { setOpen(false); setTimeout(() => { setStep('cart'); setError(''); }, 300); };

  const placeOrder = async () => {
    if (!form.name.trim() || !form.address.trim()) { setError('Name and delivery address are required.'); return; }
    if (!merchantId) { setError('Your cart is empty.'); return; }
    setPlacing(true); setError('');
    try {
      const key = 'key-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const order = await apiSend<Order>('/api/orders', 'POST', {
        merchant_id: merchantId,
        customer_name: form.name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        customer_address: form.address.trim(),
        payment_method: form.method,
        idempotency_key: key,
        items: lines.map((l) => ({ dish_id: l.dish.id, qty: l.qty, notes: l.notes })),
      });
      try { localStorage.setItem('mf_last_order', order.code); } catch { /* ignore */ }
      clear();
      setStep('done');
      setTimeout(() => { close(); navigate(`/track/${order.code}`); }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  const input = 'w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm outline-none transition focus:border-ember';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl"
            initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="font-serif text-2xl tracking-tight">Your cart</h3>
                {merchantName && <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">From {merchantName}</p>}
              </div>
              <button onClick={close} className="rounded-full border border-line p-2.5 transition hover:border-ember"><X size={16} /></button>
            </div>

            {step === 'done' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-moss text-cream"><ShieldCheck size={28} /></div>
                <h4 className="font-serif text-3xl">Order fired to the kitchen</h4>
                <p className="text-sm text-ink/60">Taking you to live tracking...</p>
              </div>
            ) : lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <p className="font-serif text-3xl italic text-ink/40">Nothing plated yet.</p>
                <p className="text-sm text-ink/60">Browse a kitchen and add something delicious.</p>
                <button onClick={close} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream">Browse kitchens</button>
              </div>
            ) : step === 'cart' ? (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                  {lines.map((l) => (
                    <div key={l.dish.id} className="flex gap-4 rounded-3xl border border-line bg-cream p-4">
                      <img src={l.dish.image_url || '/images/ramen.jpg'} alt={l.dish.name} className="h-16 w-16 rounded-2xl object-cover" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">{l.dish.name}</p>
                          <button onClick={() => remove(l.dish.id)} className="text-ink/40 transition hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                        <p className="font-mono text-xs text-ink/50">{money(l.dish.price_cents)} each</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQty(l.dish.id, l.qty - 1)} className="rounded-full border border-line p-1.5 hover:border-ember"><Minus size={13} /></button>
                            <span className="w-6 text-center font-mono text-sm font-semibold">{l.qty}</span>
                            <button onClick={() => setQty(l.dish.id, l.qty + 1)} className="rounded-full border border-line p-1.5 hover:border-ember"><Plus size={13} /></button>
                          </div>
                          <p className="font-mono text-sm font-semibold">{money(l.dish.price_cents * l.qty)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-line px-6 py-5">
                  <div className="flex justify-between font-mono text-[13px] text-ink/60"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                  <div className="flex justify-between font-mono text-[13px] text-ink/60"><span>Delivery fee</span><span>{money(fee)}</span></div>
                  <div className="flex justify-between pt-1 font-serif text-2xl"><span>Total</span><span>{money(total)}</span></div>
                  <button onClick={() => setStep('details')} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-ember py-4 text-sm font-semibold text-[#FFF6EF] transition hover:-translate-y-0.5">
                    Continue to checkout <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  <button onClick={() => setStep('cart')} className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-ink/50 hover:text-ember"><ArrowLeft size={14} /> Back to cart</button>
                  <div><label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Full name *</label><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ada Lovelace" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Email</label><input className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ada@mail.com" /></div>
                    <div><label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Phone</label><input className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 ..." /></div>
                  </div>
                  <div><label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Delivery address *</label><textarea className={input} rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, apt, landmark..." /></div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Payment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['card', 'wallet', 'cash'].map((m) => (
                        <button key={m} onClick={() => setForm({ ...form, method: m })} className={`rounded-2xl border px-3 py-3 text-sm font-semibold capitalize transition ${form.method === m ? 'border-ember bg-ember/10 text-ember' : 'border-line text-ink/60 hover:border-ember/50'}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                  {error && <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>}
                </div>
                <div className="space-y-2 border-t border-line px-6 py-5">
                  <div className="flex justify-between font-mono text-[13px] text-ink/60"><span>{lines.reduce((s, l) => s + l.qty, 0)} items + delivery</span><span>Total {money(total)}</span></div>
                  <button onClick={placeOrder} disabled={placing} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 text-sm font-semibold text-cream transition hover:-translate-y-0.5 disabled:opacity-60">
                    {placing ? <><Loader2 size={16} className="animate-spin" /> Placing order...</> : <>Place order · {money(total)} <ArrowRight size={16} /></>}
                  </button>
                  <p className="flex items-center justify-center gap-2 pt-1 font-mono text-[11px] text-ink/40"><ShieldCheck size={12} /> Idempotent checkout — double-taps never double-charge</p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
