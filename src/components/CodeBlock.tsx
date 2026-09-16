import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ title, badge, code }: { title: string; badge?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="codeblock overflow-hidden rounded-[28px] card-soft">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-sage">{title}</h3>
        <div className="flex items-center gap-3">
          {badge && <span className="font-mono text-xs text-saffron">{badge}</span>}
          <button onClick={copy} className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-xs transition hover:border-saffron">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </header>
      <pre className="overflow-x-auto p-6 font-mono text-[12.5px] leading-7 md:p-8"><code>{code}</code></pre>
    </div>
  );
}
