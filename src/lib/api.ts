export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `GET ${path} failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}

export async function apiSend<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `${method} ${path} failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}

export const money = (cents: number) => '$' + (cents / 100).toFixed(2);

export const ORDER_STEPS: Array<{ key: string; label: string }> = [
  { key: 'PLACED', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'OUT_FOR_DELIVERY', label: 'On its way' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export function statusColor(status: string): string {
  switch (status) {
    case 'PLACED': return 'bg-saffron/15 text-[#9a6b1a] border-saffron/40';
    case 'CONFIRMED': return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
    case 'PREPARING': return 'bg-violet-500/10 text-violet-700 border-violet-500/30';
    case 'OUT_FOR_DELIVERY': return 'bg-ember/10 text-ember border-ember/30';
    case 'DELIVERED': return 'bg-moss/10 text-moss border-moss/30';
    case 'CANCELLED': return 'bg-red-500/10 text-red-600 border-red-500/30';
    default: return 'bg-sage/10 text-moss border-sage/30';
  }
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.max(1, s) + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
