import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, Bike, Plus, Flame, Leaf, Search, Loader2 } from 'lucide-react';
import { apiGet, money } from '../lib/api';
import type { Dish, Merchant } from '../lib/types';
import { useCart } from '../contexts/CartContext';

export default function OrderApp() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { add, setOpen } = useCart();

  useEffect(() => {
    Promise.all([apiGet<Merchant[]>('/api/merchants?active=true'), apiGet<Dish[]>('/api/dishes')])
      .then(([m, d]) => {
        setMerchants(m);
        setDishes(d);
        if (m.length) setSelected(m[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const current = merchants.find((m) => m.id === selected);
  const menu = useMemo(() => dishes.filter((d) => d.merchant_id === selected && d.name.toLowerCase().includes(query.toLowerCase())), [dishes, selected, query]);
  const categories = useMemo(() => [...new Set(menu.map((d) => d.category))], [menu]);

  const handleAdd = (dish: Dish) => {
    const r = add(dish, current?.name || '');
    if (!r.ok) { setNotice(r.reason || 'Cannot add'); setTimeout(() => setNotice(''), 3500); }
    else { setOpen(true); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-ink/60"><Loader2 className="animate-spin" /> Firing up the kitchens...</div>;
  if (error) return <div className="mx-auto max-w-xl px-6 py-20 text-center"><p className="font-serif text-3xl">Kitchens are unreachable</p><p className="mt-3 text-sm text-ink/60">{error}</p></div>;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8">
      <div className="pb-8 pt-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.35em] text-ember">Live app · Customer surface</p>
        <h1 className="mt-2 font-serif text-[clamp(2rem,4vw,3.4rem)] leading-none tracking-[-0.03em]">Pick a kitchen, <em className="font-light text-ember">build your plate.</em></h1>
      </div>

      {notice && <div className="mb-5 rounded-2xl border border-saffron/50 bg-saffron/10 px-5 py-3 text-sm text-[#8a5c14]">{notice}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {merchants.map((m) => (
          <button key={m.id} onClick={() => setSelected(m.id)} className={`group overflow-hidden rounded-[26px] border bg-paper text-left card-soft transition hover:-translate-y-1 ${selected === m.id ? 'border-ember' : 'border-line'}`}>
            <div className="relative h-36 overflow-hidden">
              <img src={m.image_url || '/images/ramen.jpg'} alt={m.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-cream backdrop-blur">{m.cuisine}</span>
              {selected === m.id && <span className="absolute right-4 top-4 rounded-full bg-ember px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white">Selected</span>}
            </div>
            <div className="p-5">
              <h3 className="font-serif text-2xl tracking-tight">{m.name}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink/60">{m.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink/60">
                <span className="flex items-center gap-1"><Star size={12} className="fill-saffron text-saffron" /> {Number(m.rating).toFixed(1)}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {m.eta_min}-{m.eta_max} min</span>
                <span className="flex items-center gap-1"><Bike size={12} /> {money(m.delivery_fee_cents)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-3xl tracking-tight">{current.name} <span className="text-ink/40">· menu</span></h2>
            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-3 card-soft">
              <Search size={15} className="text-ink/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes..." className="w-40 bg-transparent text-sm outline-none placeholder:text-ink/40" />
            </div>
          </div>
          {menu.length === 0 && <p className="mt-8 text-sm text-ink/60">No dishes match "{query}".</p>}
          {categories.map((cat) => (
            <div key={cat} className="mt-8">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-ink/50">{cat}</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {menu.filter((d) => d.category === cat).map((d, i) => (
                  <motion.article key={d.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 3) * 0.06 }} className="group flex gap-4 rounded-[26px] border border-line bg-paper p-4 card-soft transition hover:-translate-y-1 hover:border-ember">
                    <img src={d.image_url || '/images/ramen.jpg'} alt={d.name} className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-xl leading-tight">{d.name}</h3>
                        {d.is_seasonal && <Leaf size={14} className="mt-1 shrink-0 text-moss" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink/60">{d.description}</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <span className="font-mono text-sm font-semibold">{money(d.price_cents)} <span className="flex items-center gap-1 font-normal text-ink/40"><Flame size={11} /> {d.prep_minutes}m</span></span>
                        <button onClick={() => handleAdd(d)} disabled={!d.is_available} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-cream transition hover:bg-ember disabled:opacity-40">
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
