export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const COMMON_RATIOS: [number, string][] = [
  [1, '1:1'], [5 / 4, '5:4'], [4 / 3, '4:3'], [Math.SQRT2, '√2:1 (A-series paper)'], [3 / 2, '3:2'], [16 / 10, '16:10'],
  [16 / 9, '16:9'], [2, '2:1'], [21 / 9, '21:9'], [3, '3:1'],
];

export function aspectRatio(w: number, h: number): string {
  const r = Math.max(w, h) / Math.min(w, h);
  const near = COMMON_RATIOS.find(([v]) => Math.abs(v - r) / v < 0.012);
  if (!near) return w >= h ? `${r.toFixed(2)}:1` : `1:${r.toFixed(2)}`;
  const sp = near[1].indexOf(' ');
  const ratio = sp < 0 ? near[1] : near[1].slice(0, sp);
  const note = sp < 0 ? '' : near[1].slice(sp + 1);
  const oriented = w >= h ? ratio : ratio.split(':').reverse().join(':');
  return note ? `${oriented} ${note}` : oriented;
}

export function megapixels(w: number, h: number): string {
  return `${((w * h) / 1e6).toFixed(1)} MP`;
}

export function formatDate(d: unknown): string {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  return String(d ?? '');
}

export function formatExposure(t: number): string {
  if (!t) return '';
  if (t >= 1) return `${+t.toFixed(1)} s`;
  return `1/${Math.round(1 / t)} s`;
}

export function toDms(deg: number, pos: string, neg: string): string {
  const ref = deg >= 0 ? pos : neg;
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const mFloat = (a - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${d}° ${m}′ ${s.toFixed(2)}″ ${ref}`;
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function baseName(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}
