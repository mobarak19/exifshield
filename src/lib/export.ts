import type { PhotoRecord } from './types';
import { summarize } from './summary';
import { baseName, formatBytes } from './format';
import { GROUP_LABELS } from './fields';

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function plain(v: any): any {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return undefined;
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') {
    const o: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) {
      const p = plain(x);
      if (p !== undefined) o[k] = p;
    }
    return o;
  }
  return v;
}

export function recordToJson(r: PhotoRecord) {
  const s = summarize(r);
  return {
    file: { name: r.name, size: r.size, type: r.mime, format: r.format, width: r.tech.width, height: r.tech.height, sha256: r.hash },
    summary: {
      camera: s.camera, lens: s.lens, dateTaken: s.taken?.toISOString(), iso: s.iso, aperture: s.aperture,
      shutterSpeed: s.shutter, focalLength: s.focal, focalLength35mm: s.focal35,
    },
    gps: r.gps ?? null,
    privacy: {
      score: r.privacy.score,
      findings: r.privacy.findings.map((f) => ({ item: f.label, found: f.found, detail: f.detail })),
    },
    technical: r.tech,
    containers: r.segments,
    metadata: plain(r.raw),
  };
}

export function exportJson(records: PhotoRecord[]) {
  const data = records.length === 1 ? recordToJson(records[0]) : records.map(recordToJson);
  const name = records.length === 1 ? `${baseName(records[0].name)}-metadata.json` : `photo-metadata-${records.length}.json`;
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), name);
}

const CSV_COLUMNS: [string, (r: PhotoRecord) => unknown][] = [
  ['Filename', (r) => r.name],
  ['Format', (r) => r.format.toUpperCase()],
  ['File size (bytes)', (r) => r.size],
  ['Width', (r) => r.tech.width],
  ['Height', (r) => r.tech.height],
  ['Camera make', (r) => summarize(r).make],
  ['Camera model', (r) => summarize(r).model],
  ['Lens', (r) => summarize(r).lens],
  ['Date taken', (r) => summarize(r).taken?.toISOString()],
  ['ISO', (r) => summarize(r).iso],
  ['Aperture', (r) => summarize(r).aperture],
  ['Shutter speed', (r) => summarize(r).shutter],
  ['Focal length', (r) => summarize(r).focal],
  ['Focal length 35mm', (r) => summarize(r).focal35],
  ['GPS latitude', (r) => r.gps?.lat],
  ['GPS longitude', (r) => r.gps?.lon],
  ['GPS altitude (m)', (r) => r.gps?.alt],
  ['Software', (r) => summarize(r).software],
  ['Privacy score', (r) => r.privacy.score],
  ['SHA-256', (r) => r.hash],
];

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  let s = String(v);
  // Prevent spreadsheet formula injection from metadata text.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(records: PhotoRecord[]) {
  const rows = [CSV_COLUMNS.map(([h]) => h), ...records.map((r) => CSV_COLUMNS.map(([, f]) => f(r)))];
  const csv = '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const name = records.length === 1 ? `${baseName(records[0].name)}-metadata.csv` : `photo-metadata-${records.length}.csv`;
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name);
}

export function exportTxt(r: PhotoRecord) {
  const lines = [`Photo metadata report: ${r.name}`, `Generated ${new Date().toLocaleString()}`, ''];
  lines.push(`File size: ${formatBytes(r.size)}`, `Format: ${r.format.toUpperCase()}`);
  if (r.tech.width) lines.push(`Dimensions: ${r.tech.width} × ${r.tech.height}`);
  lines.push('', `PRIVACY SCORE: ${r.privacy.score}/100. ${r.privacy.headline}`);
  for (const f of r.privacy.findings) lines.push(`  ${f.found ? '[!] FOUND    ' : '[ ] not found'}  ${f.label}${f.detail ? `: ${f.detail}` : ''}`);
  const groups = new Map<string, string[]>();
  for (const f of r.fields) {
    const g = GROUP_LABELS[f.group];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(`  ${f.label}: ${f.value}`);
  }
  for (const [g, items] of groups) lines.push('', g.toUpperCase(), ...items);
  if (r.gps) lines.push('', `Map: https://www.openstreetmap.org/?mlat=${r.gps.lat}&mlon=${r.gps.lon}#map=16/${r.gps.lat}/${r.gps.lon}`);
  download(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `${baseName(r.name)}-metadata.txt`);
}
