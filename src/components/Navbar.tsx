import { NavLink, Link } from 'react-router-dom';
import { ShoppingBag, UtensilsCrossed, Bike, LayoutDashboard, BookOpen, Radar } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition ${isActive ? 'bg-ink text-cream' : 'text-ink/70 hover:bg-ink/5'}`;

export default function Navbar() {
  const { count, setOpen } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#E4572E,#F3B04C)' }}>
            <UtensilsCrossed size={19} color="#FFF6EF" />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold uppercase tracking-[0.3em]">Mealflow</p>
            <p className="font-mono text-[11px] text-ink/50">Cloud Delivery OS · v3.2</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/" end className={link}><BookOpen size={15} /> Build guide</NavLink>
          <NavLink to="/order" className={link}><ShoppingBag size={15} /> Order food</NavLink>
          <NavLink to="/track" className={link}><Radar size={15} /> Track</NavLink>
          <NavLink to="/courier" className={link}><Bike size={15} /> Courier</NavLink>
          <NavLink to="/admin" className={link}><LayoutDashboard size={15} /> Admin</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 lg:hidden">
            <NavLink to="/order" className={link}><ShoppingBag size={15} /></NavLink>
            <NavLink to="/track" className={link}><Radar size={15} /></NavLink>
            <NavLink to="/courier" className={link}><Bike size={15} /></NavLink>
            <NavLink to="/admin" className={link}><LayoutDashboard size={15} /></NavLink>
          </nav>
          <button onClick={() => setOpen(true)} className="relative flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-[13px] font-semibold text-[#FFF6EF] transition hover:-translate-y-0.5">
            <ShoppingBag size={15} /> Cart
            {count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 font-mono text-[11px] text-cream">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
