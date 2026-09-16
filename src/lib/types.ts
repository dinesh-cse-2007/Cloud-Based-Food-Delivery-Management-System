export interface Merchant {
  id: number;
  name: string;
  cuisine: string;
  description: string;
  image_url: string;
  rating: number;
  delivery_fee_cents: number;
  min_order_cents: number;
  eta_min: number;
  eta_max: number;
  is_active: boolean;
  zone: string;
  commission_bps: number;
}

export interface Dish {
  id: number;
  merchant_id: number;
  name: string;
  description: string;
  price_cents: number;
  cost_cents: number;
  image_url: string;
  category: string;
  is_available: boolean;
  is_seasonal: boolean;
  prep_minutes: number;
  merchants?: Merchant;
}

export interface OrderItem {
  id: number;
  order_id: number;
  dish_id: number;
  dish_name: string;
  unit_price_cents: number;
  qty: number;
  notes: string;
}

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: number;
  code: string;
  merchant_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  eta_minutes: number;
  idempotency_key: string;
  payment_status: string;
  placed_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  merchants?: Merchant;
}

export type DeliveryStatus = 'queued' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';

export interface Delivery {
  id: number;
  order_id: number;
  rider_id: number | null;
  status: DeliveryStatus;
  lease_expires_at: string | null;
  picked_up_at: string | null;
  handoff_at: string | null;
  proof_note: string;
  eta_history: Array<{ at: string; eta_minutes: number; event: string }>;
  orders?: Order;
  riders?: Rider;
}

export interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle_class: string;
  kyc_level: string;
  heat_score: number;
  is_online: boolean;
  deliveries_count: number;
}

export interface Payment {
  id: number;
  order_id: number;
  amount_cents: number;
  method: string;
  status: string;
  stripe_ref: string;
  captured: boolean;
  created_at: string;
}

export interface Review {
  id: number;
  order_id: number;
  merchant_id: number;
  stars: number;
  body: string;
  response: string;
  created_at: string;
  merchants?: Merchant;
  orders?: Order;
}

export interface Stats {
  totalOrders: number;
  activeOrders: number;
  merchantCount: number;
  dishCount: number;
  ridersOnline: number;
  riderCount: number;
  deliveryCount: number;
  paymentCount: number;
  reviewCount: number;
  itemCount: number;
  revenueCents: number;
  avgOrderCents: number;
  deliveredCount: number;
  recent: Array<{ id: number; code: string; status: string; total_cents: number; customer_name: string; placed_at: string }>;
}
