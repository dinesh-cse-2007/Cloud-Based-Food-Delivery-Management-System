import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Database, Server, MonitorSmartphone, Cloud, Check } from 'lucide-react';
import { apiGet, money } from '../lib/api';
import type { Dish, Stats } from '../lib/types';
import CodeBlock from '../components/CodeBlock';

const trace = [
  { n: '01', t: 'Tap & select', d: 'React renders the cart from context, hydrated against the dishes API and edge-cached menus.' },
  { n: '02', t: 'Confirm', d: 'Checkout writes intent, mints an idempotency key, attaches customer + payment method.' },
  { n: '03', t: 'API edge', d: 'Serverless functions validate, rate-limit and price every line against live dish rows.' },
  { n: '04', t: 'Order core', d: 'Order + items + payment intent + delivery slot commit together in one flow.' },
  { n: '05', t: 'Handoff', d: 'Courier board assigns a rider, status streams back — tracked live, receipt to review.' },
];

const feSteps = [
  { n: '01', title: 'Design tokens & typography', body: 'Fraunces display faces, generous gutters, cream canvas with ember for action verbs. Every radius is 24-32px — soft, edible, confident.', tag: 'System' },
  { n: '02', title: 'Cart state architecture', body: 'A CartContext holds the session cart (single-merchant invariant enforced); the API owns server truth. Zero prop drilling, instant quantity math.', tag: 'State' },
  { n: '03', title: 'Live order surface', body: 'The track page polls /api/orders?code= every 6s and renders a 5-stage timeline, courier card, payment badge and receipt — try it with a real order.', tag: 'Streaming' },
  { n: '04', title: 'Accessible interface', body: 'Semantic landmarks, 44px targets, AA contrast on every label, full keyboard route through checkout, animated drawer for the cart.', tag: 'A11y · AA' },
  { n: '05', title: 'Routed surfaces', body: 'React Router splits customer, courier and admin surfaces. Each page fetches on mount and re-fetches after every mutation — no stale plates.', tag: 'Router' },
  { n: '06', title: 'Micro-interactions', body: 'Spring physics via framer-motion: the cart drawer glides in, status pills pulse on change, dish cards lift on hover.', tag: 'Motion' },
];

const beSteps = [
  { n: '01', title: 'Edge & validation', body: 'Every route sets CORS, validates required fields and returns typed errors — the app layer never trusts the client.', tag: 'Network' },
  { n: '02', title: 'Idempotent ingestion', body: 'POST /api/orders checks idempotency_key before touching a row — safe retries forever, double-submit impossible.', tag: 'Stripe-style' },
  { n: '03', title: 'Transactional core', body: 'Order creation writes order, items, payment intent and delivery slot as one flow: commit or nothing.', tag: 'Tx · SQL' },
  { n: '04', title: 'Snapshot pricing', body: 'order_items stores dish_name + unit_price_cents at purchase time, so later menu edits never rewrite history.', tag: 'Ledger' },
  { n: '05', title: 'Courier matching', body: 'Queued deliveries surface on the courier board; assignment writes a 30-minute TTL lease, then picks up and hands off.', tag: 'Lease' },
  { n: '06', title: 'Money saga', body: 'Payment intents move pending to captured on handoff, or to refunded on cancel, with the order row kept in sync.', tag: 'Saga' },
  { n: '07', title: 'Aggregates', body: 'GET /api/stats counts orders, revenue, fleet and recent activity in one call for dashboards and guides.', tag: 'Metrics' },
  { n: '08', title: 'Autoscale-ready', body: 'Stateless serverless functions + managed Postgres scale with lunch and dinner curves. Zero servers to babysit.', tag: 'Serverless' },
];

const apiTabs: Record<string, { title: string; code: string }> = {
  'Write path': {
    title: 'POST /api/orders · createOrder',
    code: `// Idempotent order creation — POST /api/orders
POST /api/orders  { merchant_id, items[], idempotency_key, ... }

if (await orders.findByKey(body.idempotency_key))
  return 200 { ...existing, deduped: true }  // safe retry

dishes   = await dishes.whereIn(items.map(i => i.dish_id))
merchant = await merchants.find(merchant_id)
subtotal = SUM dish.price_cents x qty      // cents, never floats
total    = subtotal + merchant.delivery_fee_cents

order    = await orders.insert({ code: 'MF-48xxx', ... })
await order_items.insert(lines.map(snapshotPrice))
await payments.insert({ order_id, status: 'pending' })
await deliveries.insert({ order_id, status: 'queued' })

return 201 { ...order, order_items, merchants }`,
  },
  'Read path': {
    title: 'GET /api/dishes · menu reads',
    code: `// Menu reads with merchant embedded — GET /api/dishes
GET /api/dishes?merchant_id=1
GET /api/dishes?limit=3

dishes.select('*, merchants(*)')
  .order('id')

// Order reads embed the full receipt in one round-trip
GET /api/orders?code=MF-48210

orders.select('*, order_items(*), merchants(*)')
  .eq('code', code)
  .single()

// -> { code, status, eta_minutes, order_items[],
//     merchants: { name, cuisine, ... } }`,
  },
  'Async': {
    title: 'PUT /api/deliveries · courier lifecycle',
    code: `// Courier lifecycle mirrors onto the order — PUT /api/deliveries
PUT /api/deliveries  { id, status, rider_id?, proof_note? }

assigned  -> lease_expires_at = now() + 30min
             orders.status = 'CONFIRMED'
picked_up -> picked_up_at = now()
             orders.status = 'OUT_FOR_DELIVERY'
delivered -> handoff_at = now()
             orders.status = 'DELIVERED'
             payments.status = 'captured'
             riders.deliveries_count += 1

// Every transition appends to deliveries.eta_history (jsonb)`,
  },
  'Money': {
    title: 'SAGA · payments + refunds',
    code: `// Money saga — capture on handoff, refund on cancel
// payments: pending -> captured | refunded

on DELIVERED:
  payments.update({ status: 'captured', captured: true })
  orders.update({ payment_status: 'captured' })

on CANCELLED:
  payments.update({ status: 'refunded', captured: false })
  orders.update({ payment_status: 'refunded' })
  deliveries.update({ status: 'cancelled' })

// Stripe refs stored per intent: pi_xxxxxxxxxxxx
// Reviews roll up: merchants.rating = avg(stars)`,
  },
};

const events = [
  ['order.placed', 'Order, items, payment intent and delivery slot commit together.', '#E4572E'],
  ['match.requested', 'Queued delivery lands on the courier board for the nearest online rider.', '#F3B04C'],
  ['courier.assigned', '30-minute lease written, order flips to CONFIRMED.', '#2E4034'],
  ['handoff.confirmed', 'Proof note + timestamps close the loop; payment captured.', '#8A9B8E'],
];

const decisions = [
  ['Why context cart?', 'Cart mutations are local-first with a single-merchant invariant; server truth stays in the orders API — no skew.'],
  ['Why snapshot pricing?', 'Menu prices change; receipts must not. Unit price is frozen per line at purchase time.'],
  ['Why poll tracking?', '6-second re-fetch keeps the timeline live without socket infra; swap in realtime channels when scale demands.'],
  ['Why proof notes?', 'Courier handoff closes with a note + timestamp. Disputes get an audit path, not a shrug.'],
];

interface SchemaTable { entity: string; core: boolean; desc: string; cols: Array<[string, string]>; countKey?: keyof Stats; }
const schema: SchemaTable[] = [
  { entity: 'merchants', core: true, countKey: 'merchantCount', desc: 'Kitchen partners with fee, ETA window, zone and commission.', cols: [['id', 'serial PK'], ['name / cuisine', 'text'], ['delivery_fee_cents', 'int'], ['eta_min / eta_max', 'int'], ['rating', 'numeric'], ['is_active', 'boolean']] },
  { entity: 'dishes', core: true, countKey: 'dishCount', desc: 'Versioned menu items with price, cost and availability.', cols: [['id', 'serial PK'], ['merchant_id', 'FK -> merchants'], ['price_cents', 'int'], ['cost_cents', 'int'], ['category', 'text'], ['is_available', 'boolean']] },
  { entity: 'orders', core: true, countKey: 'totalOrders', desc: 'The spine. Money in cents, idempotency key, status state machine.', cols: [['id', 'serial PK'], ['code', 'unique text'], ['merchant_id', 'FK -> merchants'], ['status', '6-state'], ['total_cents', 'int'], ['idempotency_key', 'unique text']] },
  { entity: 'order_items', core: true, countKey: 'itemCount', desc: 'Denormalized snapshot at purchase — price never changes retroactively.', cols: [['id', 'serial PK'], ['order_id', 'FK cascade'], ['dish_id', 'FK -> dishes'], ['qty', 'int'], ['unit_price_cents', 'snapshot int'], ['dish_name', 'snapshot text']] },
  { entity: 'deliveries', core: true, countKey: 'deliveryCount', desc: 'Courier assignment lifecycle with lease, proof and ETA history.', cols: [['id', 'serial PK'], ['order_id', 'FK unique'], ['rider_id', 'FK -> riders'], ['status', 'queued -> delivered'], ['lease_expires_at', 'timestamptz'], ['eta_history', 'jsonb']] },
  { entity: 'payments', core: true, countKey: 'paymentCount', desc: 'Intent-first ledger: every cent carries an audit reference.', cols: [['id', 'serial PK'], ['order_id', 'FK -> orders'], ['amount_cents', 'int'], ['stripe_ref', 'text'], ['status', 'pending/captured'], ['captured', 'boolean']] },
  { entity: 'riders', core: false, countKey: 'riderCount', desc: 'Driver profiles, vehicle class, KYC and heat score for matching.', cols: [['id', 'serial PK'], ['name / phone', 'text'], ['vehicle_class', 'text'], ['kyc_level', 'text'], ['heat_score', 'numeric'], ['is_online', 'boolean']] },
  { entity: 'reviews', core: false, countKey: 'reviewCount', desc: 'Stars + text with merchant response.', cols: [['id', 'serial PK'], ['order_id', 'FK -> orders'], ['merchant_id', 'FK -> merchants'], ['stars', 'check 1..5'], ['body', 'text'], ['response', 'text']] },
  { entity: 'app_users', core: false, desc: 'Customer accounts, roles and contact profiles.', cols: [['id', 'serial PK'], ['email', 'unique text'], ['name', 'text'], ['role', 'customer/admin'], ['phone', 'text'], ['created_at', 'timestamptz']] },
];

const why = [
  { n: 'Atomic spine', d: 'An order commits order, items, payment intent and delivery slot together. No partial plates, no lost revenue.' },
  { n: 'Money as integers', d: 'Cents end-to-end. Floating point never touches currency. Fee split uses deterministic math.' },
  { n: 'Time as truth', d: 'timestamptz everywhere. ETA is computed once at order time and stored, not recomputed per read.' },
  { n: 'History forever', d: 'Snapshots + eta_history jsonb keep an audit path, so refunds and disputes always resolve.' },
  { n: 'Constraint-first', d: 'Unique codes, unique idempotency keys, FKs and checks enforce invariants in the DB — the most trusted line of defense.' },
];

const topology = [
  { n: '01', t: 'CDN + WAF edge', d: 'Global cache' },
  { n: '02', t: 'React SPA', d: 'Vercel deploy' },
  { n: '03', t: 'Serverless API', d: '/api · 9 routes' },
  { n: '04', t: 'Order core logic', d: 'Idempotent writes' },
  { n: '05', t: 'Postgres', d: 'Supabase managed' },
  { n: '06', t: 'Storage + auth', d: 'Managed · live' },
];

const DDL = `-- Mealflow core · money in cents, timestamptz everywhere
CREATE TABLE merchants (
  id serial PRIMARY KEY,
  name text NOT NULL,
  cuisine text NOT NULL,
  delivery_fee_cents integer DEFAULT 299,
  min_order_cents integer DEFAULT 0,
  eta_min integer DEFAULT 20,
  eta_max integer DEFAULT 35,
  rating numeric DEFAULT 5.0,
  zone text DEFAULT 'downtown',
  commission_bps integer DEFAULT 1500,
  is_active boolean DEFAULT true
);

CREATE TABLE orders (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  merchant_id integer REFERENCES merchants(id),
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  status text DEFAULT 'PLACED',
  subtotal_cents integer NOT NULL,
  delivery_fee_cents integer DEFAULT 0,
  total_cents integer NOT NULL,
  eta_minutes integer,
  idempotency_key text UNIQUE,
  payment_status text DEFAULT 'pending',
  placed_at timestamptz DEFAULT now()
);

CREATE INDEX orders_status_idx
  ON orders (status)
  WHERE status IN ('PLACED','CONFIRMED','PREPARING','OUT_FOR_DELIVERY');

-- Snapshot lines: price frozen at purchase time
CREATE TABLE order_items (
  id serial PRIMARY KEY,
  order_id integer REFERENCES orders(id) ON DELETE CASCADE,
  dish_id integer REFERENCES dishes(id),
  dish_name text NOT NULL,
  unit_price_cents integer NOT NULL,
  qty integer NOT NULL,
  notes text DEFAULT ''
);`;

function Steps({ items }: { items: typeof feSteps }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <motion.article key={s.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 4) * 0.08 }} className="step-card group relative flex flex-col overflow-hidden rounded-[26px] border border-line bg-paper p-6 card-soft md:p-7">
          <span className="absolute right-5 top-5 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50 transition group-hover:border-ember group-hover:text-ember">{s.tag}</span>
          <span className="font-serif text-[2.6rem] italic leading-none text-ember">{s.n}</span>
          <h3 className="mt-6 font-serif text-[1.45rem] leading-[1.05] tracking-[-0.03em]">{s.title}</h3>
          <p className="mt-4 flex-1 text-sm leading-6 text-ink/60">{s.body}</p>
          <span className="mt-7 border-t border-line pt-5 font-mono text-xs uppercase tracking-[0.3em] text-sage transition group-hover:text-ember">{i < items.length - 1 ? 'Continue — next step' : 'Hand off below'}</span>
        </motion.article>
      ))}
    </div>
  );
}

export default function GuidePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tab, setTab] = useState('Write path');
  const [filter, setFilter] = useState<'all' | 'core' | 'extended'>('all');

  useEffect(() => {
    apiGet<Stats>('/api/stats').then(setStats).catch(() => undefined);
    apiGet<Dish[]>('/api/dishes?limit=3').then(setDishes).catch(() => undefined);
  }, []);

  const list = schema.filter((m) => (filter === 'all' ? true : filter === 'core' ? m.core : !m.core));

  return (
    <div>
      <section className="mx-auto max-w-[1440px] px-4 pb-14 pt-6 md:px-8">
        <div className="relative overflow-hidden rounded-[32px] card-soft" style={{ background: 'linear-gradient(160deg,#1C2620 0%,#2E4034 55%,#141210 100%)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-[420px] w-[420px] rounded-full border border-white/10" />
          <div aria-hidden className="flow-arrow pointer-events-none absolute -right-24 top-16 h-[360px] w-[360px] rounded-full border border-dashed border-saffron/40" />
          <div className="relative px-6 py-16 md:px-14 md:py-24">
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-[#EDE7DF99]">Cloud-native · Serverless · Postgres</span>
              <span className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-ink" style={{ background: 'linear-gradient(90deg,#F3B04C,#E4572E)' }}>Build document 04 — Full system</span>
            </div>
            <h1 className="font-serif text-[clamp(2.7rem,6.4vw,6.2rem)] leading-[0.95] tracking-[-0.03em] text-cream">Every meal, <em className="font-light text-saffron">orchestrated.</em></h1>
            <p className="mt-6 max-w-xl leading-7 text-[#B9C4BB] md:text-[15px]">MEALFLOW is a cloud-based food delivery management system. This reference walks the complete path of an order — from pixel to Postgres and back — across the frontend build, backend build, and relational database design. Every metric below is live from the production database.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/order" className="flex items-center gap-2 rounded-full px-8 py-5 text-sm font-semibold text-[#FFF6EF] transition hover:-translate-y-1" style={{ background: 'linear-gradient(90deg,#E4572E,#F3B04C)' }}>Launch the live app <ArrowRight size={16} /></Link>
              <a href="#database" className="rounded-full border border-white/15 px-8 py-5 text-sm font-semibold text-[#EDE7DF] backdrop-blur transition hover:-translate-y-1">Inspect the schema</a>
            </div>
            <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/10 md:grid-cols-4">
              <div className="bg-[#141210cc] p-6 md:p-8"><p className="font-serif text-4xl text-cream md:text-5xl">{stats ? stats.totalOrders : '—'}<span className="text-2xl text-saffron"> orders</span></p><p className="mt-3 text-[12px] uppercase tracking-[0.25em] text-sage">Live in Postgres</p></div>
              <div className="bg-[#1C2620cc] p-6 md:p-8"><p className="font-serif text-4xl text-cream md:text-5xl">{stats ? money(stats.revenueCents) : '—'}</p><p className="mt-3 text-[12px] uppercase tracking-[0.25em] text-sage">Captured revenue</p></div>
              <div className="bg-[#2E4034cc] p-6 md:p-8"><p className="font-serif text-4xl text-cream md:text-5xl">{stats ? stats.merchantCount : '—'}<span className="text-2xl text-saffron"> kitchens</span></p><p className="mt-3 text-[12px] uppercase tracking-[0.25em] text-sage">Serving now</p></div>
              <div className="bg-ember p-6 md:p-8"><p className="font-serif text-4xl text-[#FFF6EF] md:text-5xl">{stats ? stats.ridersOnline : '—'}<span className="text-xl"> riders</span></p><p className="mt-3 text-[12px] uppercase tracking-[0.25em] text-[#FFD9C6]">Online and rolling</p></div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-[1440px] flex-col gap-16 px-4 pb-24 md:px-8">
        <section aria-label="Order journey">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-[clamp(1.6rem,3vw,2.6rem)] tracking-[-0.03em]">The journey, in one breath.</h2>
            <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-ink/50">Live trace · Order #MF-48210</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {trace.map((s) => (
              <Link key={s.n} to="/track/MF-48210" className="group rounded-[26px] border border-line bg-paper p-6 card-soft transition hover:-translate-y-2 hover:border-ember">
                <span className="font-serif text-4xl italic text-ember">{s.n}</span>
                <h3 className="mt-6 font-serif text-2xl tracking-[-0.03em] group-hover:underline group-hover:decoration-ember group-hover:underline-offset-8">{s.t}</h3>
                <p className="mt-3 text-sm leading-6 text-ink/60">{s.d}</p>
                <span className="mt-6 block font-mono text-xs uppercase tracking-[0.3em] text-sage transition-transform group-hover:translate-x-2">Trace live ↓</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="frontend" className="scroll-mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.35em] text-ember"><MonitorSmartphone size={14} /> Module 01 — Interface</p>
              <h2 className="font-serif text-[clamp(1.8rem,3.4vw,3rem)] leading-[1] tracking-[-0.03em]">Frontend build, step by step.</h2>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-line bg-paper px-5 py-3 text-sm card-soft">Stack <span className="font-mono text-xs text-ember">React 19 · Router · Tailwind v4 · Motion</span></div>
          </div>
          <Steps items={feSteps} />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[28px] bg-paper card-soft">
              <header className="flex items-center justify-between border-b border-line px-6 py-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Live order surface</h3>
                <span className="rounded-full border border-line px-4 py-1.5 font-mono text-xs">Real dishes · live API</span>
              </header>
              <div className="p-6 md:p-8">
                <Link to="/track/MF-48210" className="relative block overflow-hidden rounded-[24px] p-6 text-left" style={{ background: 'linear-gradient(135deg,#1C2620,#2E4034)' }}>
                  <div className="relative z-10">
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-saffron">Courier en route · live demo order</p>
                    <h4 className="mt-3 font-serif text-3xl leading-[1] tracking-[-0.03em] text-cream md:text-4xl">Sora ramen · Table 12</h4>
                    <div className="mt-6 flex items-center gap-3">
                      <span className="rounded-full px-5 py-3 text-sm font-semibold text-ink" style={{ background: 'linear-gradient(90deg,#F3B04C,#E4572E)' }}>Track courier</span>
                      <span className="rounded-full border border-white/10 px-5 py-3 text-sm text-[#EDE7DFcc]">Receipt</span>
                    </div>
                  </div>
                  <svg className="absolute right-5 top-5 h-24 w-24 opacity-40" viewBox="0 0 100 100" fill="none" stroke="#F3B04C" strokeWidth="1"><circle cx="50" cy="50" r="46" strokeDasharray="3 5" /><circle cx="50" cy="50" r="30" /></svg>
                </Link>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {dishes.map((d, i) => (
                    <Link key={d.id} to="/order" className="rounded-[20px] border border-line bg-cream p-4 text-left transition hover:-translate-y-2 hover:border-saffron">
                      <span className="font-mono text-xs text-ember">0{i + 1}</span>
                      <span className="mt-2 block font-serif text-lg leading-tight tracking-[-0.02em]">{d.name}</span>
                      <span className="mt-3 block font-mono text-sm text-ink/50">{money(d.price_cents)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </article>
            <article className="flex flex-col justify-center gap-5 rounded-[28px] bg-deep p-6 card-soft md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-sage">Component decision log</h3>
              <div className="flex flex-col gap-4">
                {decisions.map((d) => (
                  <div key={d[0]} className="rounded-[22px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1">
                    <span className="block font-mono text-[11px] uppercase tracking-[0.3em] text-saffron">{d[0]}</span>
                    <span className="mt-3 block font-serif text-xl leading-snug tracking-[-0.02em] text-cream">{d[1]}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section id="backend" className="scroll-mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.35em] text-ember"><Server size={14} /> Module 02 — Services</p>
              <h2 className="font-serif text-[clamp(1.8rem,3.4vw,3rem)] leading-[1] tracking-[-0.03em]">Backend build, step by step.</h2>
            </div>
            <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist" aria-label="API stages">
              {Object.keys(apiTabs).map((t) => (
                <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t} className={`tabbtn rounded-full border border-line px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] md:text-sm ${tab === t ? 'active border-ink' : 'bg-paper'}`}>{t}</button>
              ))}
            </div>
          </div>
          <Steps items={beSteps} />
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <CodeBlock title={apiTabs[tab].title} badge="9 live routes · /api" code={apiTabs[tab].code} />
            <div className="flex flex-col gap-4 rounded-[28px] bg-paper p-6 card-soft md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Async event spine</h3>
              <div className="grid flex-1 gap-4">
                {events.map((e, i) => (
                  <div key={e[0]} className="flex items-start gap-5 rounded-[22px] border border-line bg-cream p-5 transition hover:-translate-y-1 hover:border-ember">
                    <span className="mt-1 rounded-full px-3 py-2 font-mono text-xs text-[#FFF6EF]" style={{ background: e[2] }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="block font-serif text-xl tracking-[-0.02em]">{e[0]}</span>
                      <span className="mt-2 block text-sm leading-5 text-ink/60">{e[1]}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="database" className="scroll-mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.35em] text-ember"><Database size={14} /> Module 03 — Persistence</p>
              <h2 className="font-serif text-[clamp(1.8rem,3.4vw,3rem)] leading-[1] tracking-[-0.03em]">Database design.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {(['all', 'core', 'extended'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full border border-line px-5 py-3 text-sm transition ${filter === f ? 'bg-ink text-cream glow' : 'bg-paper'}`}>{f === 'all' ? 'All entities' : f === 'core' ? 'Core loop' : 'Extended'}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((m) => (
              <article key={m.entity} className="schema-table flex flex-col overflow-hidden rounded-[26px] border border-line bg-paper card-soft">
                <header className="flex items-center justify-between border-b border-line px-6 py-5">
                  <h3 className="font-serif text-2xl tracking-[-0.03em]">{m.entity}<span className="ml-3 align-middle font-mono text-xs uppercase tracking-[0.25em] text-sage">table</span></h3>
                  {m.core ? <span className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[#FFF6EF]" style={{ background: 'linear-gradient(90deg,#E4572E,#F3B04C)' }}>Core</span> : <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">Extended</span>}
                </header>
                <p className="px-6 pt-5 text-sm leading-6 text-ink/60">{m.desc}</p>
                <ul className="m-2 mt-4 flex-1 p-4">
                  {m.cols.map((c) => (
                    <li key={c[0]} className="flex items-center justify-between gap-4 rounded-2xl border-b border-line px-4 py-3.5 last:border-b-0">
                      <code className="font-mono text-[13px] text-moss">{c[0]}</code>
                      <span className="text-right font-mono text-[11px] uppercase tracking-[0.15em] text-[#B0602F]">{c[1]}</span>
                    </li>
                  ))}
                </ul>
                {m.countKey && stats !== null && (
                  <p className="flex items-center gap-2 border-t border-line px-6 py-4 font-mono text-xs text-ink/50"><Check size={13} className="text-moss" /> {(stats[m.countKey] as number)} live rows in production</p>
                )}
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <CodeBlock title="migrations/0042_init_core.sql · Postgres" badge="FKs + uniques enforced" code={DDL} />
            <div className="flex flex-col gap-5 rounded-[28px] bg-paper p-6 card-soft md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em]">Design rationale · why this schema works</h3>
              <div className="grid flex-1 gap-4">
                {why.map((w, i) => (
                  <div key={w.n} className="rounded-[22px] border border-line bg-cream p-6 transition hover:-translate-y-1 hover:border-ember">
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ember">Principle · {String(i + 1).padStart(2, '0')}</span>
                    <h4 className="mt-3 font-serif text-2xl tracking-[-0.03em]">{w.n}</h4>
                    <p className="mt-3 text-sm leading-6 text-ink/60">{w.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Cloud topology" className="rounded-[32px] p-6 card-soft md:p-12" style={{ background: 'linear-gradient(160deg,#E4572E,#F3B04C)' }}>
          <div className="flex flex-wrap items-end justify-between gap-6 text-[#FFF6EF]">
            <h2 className="flex items-center gap-3 font-serif text-[clamp(1.5rem,2.8vw,2.4rem)] leading-none tracking-[-0.03em]"><Cloud size={30} /> Where it all lives — cloud blueprint.</h2>
            <Link to="/order" className="inline-flex items-center gap-2 rounded-full bg-[#FFF6EF] px-7 py-4 text-sm font-semibold text-ink transition hover:-translate-y-1">Order in production <ArrowUpRight size={16} /></Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {topology.map((s) => (
              <div key={s.n} className="group rounded-[24px] border border-white/20 bg-ink/20 p-6 backdrop-blur transition hover:-translate-y-3">
                <span className="font-serif text-3xl italic text-[#FFF6EFcc]">{s.n}</span>
                <h3 className="mt-5 font-serif text-xl leading-tight tracking-[-0.02em] text-[#FFF6EF]">{s.t}</h3>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[#7C2D12]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
