import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Dish } from '../lib/types';

export interface CartLine {
  dish: Dish;
  qty: number;
  notes: string;
}

interface CartCtx {
  lines: CartLine[];
  merchantId: number | null;
  merchantName: string;
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  add: (dish: Dish, merchantName: string) => { ok: boolean; reason?: string };
  remove: (dishId: number) => void;
  setQty: (dishId: number, qty: number) => void;
  setNotes: (dishId: number, notes: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [merchantId, setMerchantId] = useState<number | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [isOpen, setOpen] = useState(false);

  const value = useMemo<CartCtx>(() => ({
    lines, merchantId, merchantName, isOpen, setOpen,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.dish.price_cents, 0),
    add: (dish: Dish, mName: string) => {
      if (merchantId !== null && merchantId !== dish.merchant_id) {
        return { ok: false, reason: 'Your cart already has items from ' + merchantName + '. Clear it to order from another kitchen.' };
      }
      setMerchantId(dish.merchant_id);
      setMerchantName(mName);
      setLines((prev) => {
        const found = prev.find((l) => l.dish.id === dish.id);
        if (found) return prev.map((l) => (l.dish.id === dish.id ? { ...l, qty: Math.min(20, l.qty + 1) } : l));
        return [...prev, { dish, qty: 1, notes: '' }];
      });
      return { ok: true };
    },
    remove: (dishId: number) => {
      setLines((prev) => {
        const next = prev.filter((l) => l.dish.id !== dishId);
        if (next.length === 0) { setMerchantId(null); setMerchantName(''); }
        return next;
      });
    },
    setQty: (dishId: number, qty: number) => {
      if (qty <= 0) {
        setLines((prev) => {
          const next = prev.filter((l) => l.dish.id !== dishId);
          if (next.length === 0) { setMerchantId(null); setMerchantName(''); }
          return next;
        });
        return;
      }
      setLines((prev) => prev.map((l) => (l.dish.id === dishId ? { ...l, qty: Math.min(20, qty) } : l)));
    },
    setNotes: (dishId: number, notes: string) => {
      setLines((prev) => prev.map((l) => (l.dish.id === dishId ? { ...l, notes } : l)));
    },
    clear: () => { setLines([]); setMerchantId(null); setMerchantName(''); },
  }), [lines, merchantId, merchantName, isOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
