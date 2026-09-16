import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import GuidePage from './pages/GuidePage';
import OrderApp from './pages/OrderApp';
import TrackPage from './pages/TrackPage';
import CourierPage from './pages/CourierPage';
import AdminPage from './pages/AdminPage';
import CartDrawer from './components/CartDrawer';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/50">Mealflow · Cloud delivery OS</p>
        <p className="font-mono text-xs text-ink/40">React + serverless API + Postgres · 9 tables · 9 routes</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <div className="grain min-h-screen bg-cream font-sans text-ink">
          <Navbar />
          <Routes>
            <Route path="/" element={<GuidePage />} />
            <Route path="/order" element={<OrderApp />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/track/:code" element={<TrackPage />} />
            <Route path="/courier" element={<CourierPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          <Footer />
          <CartDrawer />
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}
