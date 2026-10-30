// Pure render functions for the workspace. They return HTML strings; every
// value coming from a file goes through esc().
import type { CleanCategory, Field, GroupId, PhotoRecord } from '../lib/types';
import { escapeHtml as esc, formatBytes, toDms } from '../lib/format';
import { GROUP_LABELS } from '../lib/fields';
import { describe, summarize } from '../lib/summary';
import { icon } from '../lib/icons';
import type { CleanResult } from '../lib/clean';
import { offersHtml } from '../lib/offers';

export type Tab = 'overview' | 'privacy' | 'location' | 'camera' | 'all' | 'clean';
export type PresetId = 'all' | 'private' | 'location' | 'custom';

export interface CleanState {
  preset: PresetId;
  custom: Set<CleanCategory>;
  keepIcc: boolean;
  keepOrientation: boolean;
  busy: boolean;
  error?: string;
  result?: { res: CleanResult; after: PhotoRecord };
}

const LEVEL_TEXT = { low: 'Low risk', medium: 'Medium risk', high: 'High risk' } as const;

export function ring(score: number, level: string, lg = false) {
  return `<div class="ring ${lg ? 'lg' : ''} lvl-${level}" style="--v:${score}" role="img" aria-label="Privacy score ${score} out of 100"><b>${score}<small>/100</small></b></div>`;
}

// ------------------------------------------------------------------ header
export function resultBar(r: PhotoRecord, inBatch: boolean) {
  return `<div class="result-bar">
    ${inBatch ? `<button class="btn btn-ghost btn-sm" data-action="back">${icon('arrowLeft', 18)} All photos</button>` : ''}
    <div class="title"><h2 title="${esc(r.name)}">${esc(r.name)}</h2><p>${esc(describe(r))} · ${formatBytes(r.size)}</p></div>
    <div class="menu">
      <button class="btn btn-sm" data-action="menu" aria-haspopup="true" aria-expanded="false">${icon('download', 18)} Export ${icon('chevronDown', 16)}</button>
      <div class="menu-list" hidden role="menu">
        <button role="menuitem" data-action="export-json">${icon('code', 18)} Metadata as JSON</button>
        <button role="menuitem" data-action="export-csv">${icon('table', 18)} Metadata as CSV</button>
        <button role="menuitem" data-action="export-txt">${icon('fileText', 18)} Text report (.txt)</button>
        <button role="menuitem" data-action="print">${icon('printer', 18)} Print / save as PDF</button>
      </div>
    </div>
    ${inBatch ? '' : `<button class="btn btn-sm" data-action="new">${icon('plus', 18)} New photo</button>`}
  </div>`;
}

// ------------------------------------------------------------------ side column
export function side(r: PhotoRecord) {
  const p = r.privacy;
  const preview = r.previewUrl
    ? `<img src="${r.previewUrl}" alt="Preview of ${esc(r.name)}" data-preview>`
    : '';
  return `<aside class="side">
    <div class="card card-pad" style="padding:12px">
      <div class="preview">${preview}<div class="noprev" ${r.previewUrl ? 'hidden' : ''}>${icon('image', 32)}<span>Preview not available in this browser.<br>Metadata was still read.</span></div></div>
    </div>
    <div class="card card-pad score-wrap">
      <div class="score-card">${ring(p.score, p.level)}<div><h3>${LEVEL_TEXT[p.level]}</h3><p>${esc(p.headline)}</p></div></div>
      <div style="display:grid;gap:8px;margin-top:16px">
        ${r.gps ? `<button class="btn btn-danger btn-block" data-action="goto-clean" data-preset="location">${icon('pinOff', 18)} Remove location only</button>` : ''}
        <button class="btn btn-primary btn-block" data-action="goto-clean" data-preset="all">${icon('shieldCheck', 18)} Remove all metadata</button>
        <button class="btn btn-ghost btn-block btn-sm" data-action="tab" data-tab="privacy">See the full privacy report ${icon('arrowRight', 16)}</button>
      </div>
    </div>
  </aside>`;
}

export function tabs(r: PhotoRecord, active: Tab) {
  const t: [Tab, string, string, boolean][] = [
    ['overview', 'Overview', 'eye', false],
    ['privacy', 'Privacy', 'shield', r.privacy.level === 'high'],
    ['location', 'Location', 'pin', !!r.gps],
    ['camera', 'Camera', 'camera', false],
    ['all', `All data (${r.fields.length})`, 'layers', false],
    ['clean', 'Clean', 'sparkles', false],
  ];
  return `<div class="tabs" role="tablist" aria-label="Metadata views">${t
    .map(([id, label, ic, dot]) => `<button class="tab" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${id === active}" tabindex="${id === active ? 0 : -1}" data-action="tab" data-tab="${id}">${icon(ic, 17)}${esc(label)}${dot ? '<span class="dot" aria-label="needs attention"></span>' : ''}</button>`)
    .join('')}</div>`;
}

// ------------------------------------------------------------------ overview
function tile(k: string, v: string | undefined, ic: string) {
  return `<div class="tile"><div class="k">${icon(ic, 14)}${esc(k)}</div><div class="v ${v ? '' : 'none'}">${v ? esc(v) : 'Not recorded'}</div></div>`;
}

export function gpsAlert(r: PhotoRecord) {
  if (!r.gps) return '';
  return `<div class="alert alert-high" role="alert">${icon('pin', 22)}<div>
    <h3>This photo contains its GPS location</h3>
    <p>Coordinates <span class="mono">${r.gps.lat.toFixed(5)}, ${r.gps.lon.toFixed(5)}</span> show where it was taken. Anyone you send the original file to can see them.</p>
    <div class="actions"><button class="btn btn-sm" data-action="tab" data-tab="location">${icon('map', 16)} View location</button><button class="btn btn-sm btn-danger" data-action="goto-clean" data-preset="location">${icon('pinOff', 16)} Remove location</button></div>
  </div></div>`;
}

export function overview(r: PhotoRecord) {
  const s = summarize(r);
  const exposure = [s.aperture, s.shutter, s.iso ? `ISO ${s.iso}` : ''].filter(Boolean).join(' · ');
  const focal = s.focal ? `${s.focal}${s.focal35 ? ` (${s.focal35} mm equiv.)` : ''}` : undefined;
  const seg = r.segments;
  const chips: [string, boolean, boolean?][] = [
    ['EXIF', seg.exif], ['GPS', seg.gps, true], ['IPTC', seg.iptc], ['XMP', seg.xmp], ['ICC profile', seg.icc],
    ['Thumbnail', seg.thumbnail, true], ['Maker notes', seg.makerNote], ['Content Credentials', seg.c2pa], ['Comments', seg.comment], ['Extra images (MPF)', seg.mpf],
  ];
  const t = r.tech;
  const techRows: [string, string | undefined][] = [
    ['Format', r.format === 'unknown' ? r.ext.toUpperCase() || 'Unknown' : r.format.toUpperCase()],
    ['MIME type', r.mime],
    ['Dimensions', s.dimensions],
    ['Megapixels', s.megapixels],
    ['Aspect ratio', s.aspect],
    ['File size', `${formatBytes(r.size)} (${r.size.toLocaleString()} bytes)`],
    ['Resolution (DPI)', t.dpiX ? `${t.dpiX} × ${t.dpiY} DPI` : undefined],
    ['Color model', t.colorModel],
    ['Color profile', t.iccName],
    ['Bit depth', t.bitDepth ? `${t.bitDepth}-bit${t.components ? ` × ${t.components} channels` : ''}` : undefined],
    ['Chroma subsampling', t.subsampling],
    ['Encoding', r.format === 'jpeg' ? (t.progressive ? 'Progressive' : 'Baseline') : t.lossless !== undefined ? (t.lossless ? 'Lossless' : 'Lossy') : undefined],
    ['Estimated JPEG quality', t.quality ? `≈ ${t.quality} / 100` : undefined],
    ['Transparency', t.hasAlpha === undefined ? undefined : t.hasAlpha ? 'Yes (alpha channel)' : 'No'],
    ['Animated', t.animated ? 'Yes' : undefined],
    ['SHA-256', r.hash ? `${r.hash.slice(0, 16)}…` : undefined],
  ];
  return `${gpsAlert(r)}
  <div class="tiles">
    ${tile('Camera', s.camera, 'camera')}
    ${tile('Lens', s.lens, 'aperture')}
    ${tile('Date taken', s.takenText, 'clock')}
    ${tile('Exposure', exposure || undefined, 'sliders')}
    ${tile('Focal length', focal, 'scan')}
    ${tile('Dimensions', s.dimensions ? `${s.dimensions}${s.megapixels ? ` · ${s.megapixels}` : ''}` : undefined, 'image')}
  </div>
  <h3 class="section-title">${icon('layers', 18)} What's inside this file</h3>
  <div class="containers">${chips
    .map(([label, on, risky]) => `<span class="chip ${on ? (risky ? 'warn' : 'on') : ''}">${icon(on ? 'check' : 'x', 14)}${esc(label)}</span>`)
    .join('')}</div>
  <h3 class="section-title">${icon('file', 18)} Image &amp; file details</h3>
  <table class="kv">${techRows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('')}</table>`;
}

// ------------------------------------------------------------------ privacy
const FINDING_ICON: Record<string, string> = {
  gps: 'pin', place: 'globe', serial: 'hash', author: 'user', datetime: 'clock', thumbnail: 'image',
  device: 'camera', software: 'cpu', description: 'fileText', history: 'layers', c2pa: 'shieldCheck',
};

export function privacy(r: PhotoRecord) {
  const p = r.privacy;
  const found = p.findings.filter((f) => f.found).sort((a, b) => b.weight - a.weight);
  const clear = p.findings.filter((f) => !f.found);
  const row = (f: (typeof p.findings)[number]) => `<li class="finding ${f.found ? 'found' : ''} ${f.severity}">
      <div class="fi">${icon(f.found ? FINDING_ICON[f.id] ?? 'alert' : 'check', 18)}</div>
      <div><div class="fh"><h4>${esc(f.label)}</h4><span class="status">${f.found ? `Found · ${f.severity}` : 'Not found'}</span></div>${f.found && f.detail ? `<div class="detail">${esc(f.detail)}</div>` : ''}<p>${esc(f.explain)}</p></div>
    </li>`;
  const advice = r.gps
    ? 'Remove the GPS location before sharing this photo publicly or with people you don’t know.'
    : found.some((f) => f.severity !== 'low')
      ? 'Remove personal details before posting this photo anonymously.'
      : 'Nothing sensitive stands out. You can still remove all metadata for maximum privacy.';
  return `<div class="score-hero">${ring(p.score, p.level, true)}<div>
      <h3>${esc(p.headline)}</h3>
      <p><strong>Recommended:</strong> ${esc(advice)}</p>
      <div class="actions">
        ${r.gps ? `<button class="btn btn-danger" data-action="goto-clean" data-preset="location">${icon('pinOff', 18)} Remove location</button>` : ''}
        <button class="btn btn-primary" data-action="goto-clean" data-preset="${found.length ? 'private' : 'all'}">${icon('shieldCheck', 18)} ${found.length ? 'Remove private data' : 'Remove all metadata'}</button>
      </div>
    </div></div>
    ${p.level !== 'low' ? offersHtml('privacyRisk', { compact: true }) : ''}
    ${found.length ? `<h3 class="section-title">${icon('shieldAlert', 18)} Found in this photo (${found.length})</h3><ul class="findings">${found.map(row).join('')}</ul>` : ''}
    <h3 class="section-title">${icon('checkCircle', 18)} Not found (${clear.length})</h3>
    <ul class="findings">${clear.map(row).join('')}</ul>
    <p class="small muted" style="margin-top:14px">The score is an estimate based on which metadata is present. It does not analyse what is <em>visible</em> in the photo (faces, street signs, screens), which can also reveal personal information.</p>`;
}

// ------------------------------------------------------------------ location
export function location(r: PhotoRecord, mapLoaded: boolean) {
  if (!r.gps) {
    return `<div class="alert alert-ok">${icon('checkCircle', 22)}<div><h3>No GPS location in this photo</h3><p>This file doesn't contain coordinates, so it can't reveal where it was taken through EXIF. ${r.privacy.findings[1].found ? 'However, written place names were found. See the Privacy tab.' : ''}</p></div></div>
      <p class="small muted">Tip: on iPhone, open the Share sheet → <strong>Options</strong> → turn off <strong>Location</strong> to share photos without GPS.</p>`;
  }
  const g = r.gps;
  const coordText = `${g.lat.toFixed(6)}, ${g.lon.toFixed(6)}`;
  const osm = `https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lon}#map=16/${g.lat}/${g.lon}`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lon}`;
  const amaps = `https://maps.apple.com/?ll=${g.lat},${g.lon}&q=Photo`;
  return `${gpsAlert(r).replace(/<button class="btn btn-sm" data-action="tab" data-tab="location">.*?<\/button>/, '')}
    <div class="coords">
      <div class="tile"><div class="k">${icon('pin', 14)}Decimal</div><div class="v mono">${coordText}</div></div>
      <div class="tile"><div class="k">${icon('globe', 14)}Degrees, minutes, seconds</div><div class="v mono">${toDms(g.lat, 'N', 'S')}<br>${toDms(g.lon, 'E', 'W')}</div></div>
      ${g.alt !== undefined ? `<div class="tile"><div class="k">Altitude</div><div class="v">${g.alt.toFixed(1)} m</div></div>` : ''}
      ${g.direction !== undefined ? `<div class="tile"><div class="k">Camera facing</div><div class="v">${g.direction.toFixed(0)}° ${compass(g.direction)}</div></div>` : ''}
      ${g.timestamp ? `<div class="tile"><div class="k">${icon('clock', 14)}GPS time</div><div class="v">${esc(g.timestamp)}</div></div>` : ''}
    </div>
    <div class="map-box" data-map>${mapLoaded ? '' : `<div class="optin">${icon('map', 30)}<strong>Show this location on a map</strong><span>Loading the map downloads tiles from OpenStreetMap, which reveals the approximate area to their servers. Your photo is never sent.</span><button class="btn btn-primary btn-sm" data-action="map-optin">${icon('eye', 16)} Show map</button></div>`}</div>
    <div class="link-row">
      <button class="btn btn-sm" data-action="copy" data-copy="${coordText}">${icon('copy', 16)} Copy coordinates</button>
      <a class="btn btn-sm" href="${osm}" target="_blank" rel="noopener noreferrer">${icon('external', 16)} OpenStreetMap</a>
      <a class="btn btn-sm" href="${gmaps}" target="_blank" rel="noopener noreferrer">${icon('external', 16)} Google Maps</a>
      <a class="btn btn-sm" href="${amaps}" target="_blank" rel="noopener noreferrer">${icon('external', 16)} Apple Maps</a>
    </div>`;
}

function compass(d: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
}

// ------------------------------------------------------------------ camera
function exposureInsights(r: PhotoRecord): string[] {
  const ex = r.raw.exif ?? {};
  const s = summarize(r);
  const out: string[] = [];
  const iso = s.iso ?? 0;
  const t: number | undefined = typeof ex.ExposureTime === 'number' ? ex.ExposureTime : undefined;
  const f: number | undefined = typeof ex.FNumber === 'number' ? ex.FNumber : undefined;
  if (iso >= 1600) out.push(`High ISO (${iso}): likely shot in low light, so expect visible noise.`);
  else if (iso && iso <= 200) out.push(`Low ISO (${iso}): plenty of light, minimal noise.`);
  if (t !== undefined) {
    if (t >= 1 / 30) out.push(`Slow shutter (${s.shutter}): motion blur is likely without a tripod or stabilisation.`);
    else if (t <= 1 / 1000) out.push(`Very fast shutter (${s.shutter}): freezes motion such as sport or wildlife.`);
    if (s.focal35 && t > 1 / s.focal35 && t < 1 / 30)
      out.push(`Slower than the handheld rule of thumb (1/${s.focal35} s at ${s.focal35} mm equivalent), so there's some risk of camera shake.`);
  }
  if (f !== undefined) {
    if (f <= 2.8) out.push(`Wide aperture (${s.aperture}): shallow depth of field with a softly blurred background.`);
    else if (f >= 8) out.push(`Narrow aperture (${s.aperture}): deep focus, typical for landscapes and architecture.`);
  }
  if (typeof ex.Flash === 'string' && /fired/i.test(ex.Flash) && !/not fire|did not/i.test(ex.Flash)) out.push('The flash fired.');
  if (typeof ex.ExposureCompensation === 'number' && ex.ExposureCompensation !== 0)
    out.push(`Exposure was manually ${ex.ExposureCompensation > 0 ? 'brightened' : 'darkened'} (${s.exposureComp}).`);
  return out;
}

export function camera(r: PhotoRecord, showRaw: boolean) {
  const groups: GroupId[] = ['camera', 'settings', 'datetime'];
  const ins = exposureInsights(r);
  const body = groups.map((g) => fieldGroup(g, r.fields.filter((f) => f.group === g), showRaw, true)).join('');
  return `${ins.length ? `<h3 class="section-title">${icon('sparkles', 18)} What the settings tell us</h3><ul class="insight-list">${ins.map((i) => `<li>${icon('check', 18)}<span>${esc(i)}</span></li>`).join('')}</ul>` : ''}
    ${body || `<div class="alert alert-info">${icon('info', 22)}<div><h3>No camera data</h3><p>This file has no camera or exposure information. Screenshots, edited exports and images downloaded from social media usually have it stripped.</p></div></div>`}
    ${offersHtml('camera', { title: 'Improve your photos' })}`;
}

// ------------------------------------------------------------------ all fields
export function fieldGroup(g: GroupId, fields: Field[], showRaw: boolean, open: boolean) {
  if (!fields.length) return '';
  return `<details class="group" ${open ? 'open' : ''}><summary>${esc(GROUP_LABELS[g])}<span class="count">${fields.length}</span>${icon('chevronDown', 18, 'chev')}</summary>
    <table class="kv">${fields
      .map((f) => `<tr><th scope="row">${esc(f.label)}${f.sensitive ? '<span class="sens" title="Potentially sensitive" aria-label="potentially sensitive"></span>' : ''}${showRaw ? `<span class="rawkey">${esc(f.key)}</span>` : ''}</th><td>${esc(f.value)}</td></tr>`)
      .join('')}</table></details>`;
}

const GROUP_ORDER: GroupId[] = ['location', 'datetime', 'camera', 'settings', 'author', 'software', 'image', 'iptc', 'xmp', 'icc', 'other', 'file'];

export function allFieldsList(r: PhotoRecord, query: string, showRaw: boolean) {
  const q = query.trim().toLowerCase();
  const fields = q ? r.fields.filter((f) => `${f.label} ${f.key} ${f.value}`.toLowerCase().includes(q)) : r.fields;
  if (!r.fields.length) {
    return `<div class="alert alert-ok">${icon('checkCircle', 22)}<div><h3>No metadata found</h3><p>This image doesn't contain EXIF, IPTC or XMP metadata.</p></div></div>`;
  }
  if (!fields.length) return `<p class="muted">No fields match “${esc(query)}”.</p>`;
  return GROUP_ORDER.map((g) => fieldGroup(g, fields.filter((f) => f.group === g), showRaw, !!q || g !== 'icc')).join('');
}

export function allFields(r: PhotoRecord, query: string, showRaw: boolean) {
  return `<div class="toolbar">
      <div class="search grow" style="margin:0">${icon('search', 18)}<input type="search" placeholder="Search ${r.fields.length} fields (e.g. lens, GPS, date)" value="${esc(query)}" data-input="query" aria-label="Search metadata"></div>
      <label class="switch"><input type="checkbox" data-input="raw" ${showRaw ? 'checked' : ''}> Show tag names</label>
      <button class="btn btn-sm" data-action="copy-json">${icon('copy', 16)} Copy JSON</button>
    </div>
    <p class="small muted" style="margin-top:-4px"><span class="sens" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--high);margin-right:6px"></span>marks potentially sensitive fields.</p>
    <div data-fields>${allFieldsList(r, query, showRaw)}</div>`;
}

// ------------------------------------------------------------------ clean
export const CATEGORY_INFO: [CleanCategory, string, string][] = [
  ['gps', 'GPS location', 'Coordinates, altitude, direction, plus written place names'],
  ['serial', 'Serial numbers & unique IDs', 'Camera/lens serials, image unique ID, maker notes'],
  ['author', 'Author, owner & copyright', 'Artist, owner name, copyright notice'],
  ['datetime', 'Date & time', 'When the photo was taken, digitised and modified'],
  ['description', 'Descriptions & comments', 'Captions, comments, keywords, titles'],
  ['thumbnail', 'Embedded thumbnail', 'Hidden preview that may show the original'],
  ['device', 'Camera & lens model', 'Make, model, lens'],
  ['software', 'Software', 'Editing app and OS version'],
  ['settings', 'Exposure settings', 'ISO, aperture, shutter speed, focal length'],
  ['xmp', 'XMP block', 'Adobe/editor metadata and edit history'],
  ['iptc', 'IPTC block', 'Press/agency captions, credits, locations'],
  ['c2pa', 'Content Credentials', 'C2PA provenance manifest'],
];

export function categoryPresent(r: PhotoRecord, c: CleanCategory): boolean {
  const f = Object.fromEntries(r.privacy.findings.map((x) => [x.id, x.found]));
  switch (c) {
    case 'gps': return !!(f.gps || f.place);
    case 'serial': return !!f.serial || r.segments.makerNote;
    case 'author': return !!f.author;
    case 'datetime': return !!f.datetime || r.segments.textChunks;
    case 'description': return !!f.description;
    case 'thumbnail': return r.segments.thumbnail;
    case 'device': return !!f.device;
    case 'software': return !!f.software;
    case 'settings': return r.fields.some((x) => x.group === 'settings');
    case 'xmp': return r.segments.xmp;
    case 'iptc': return r.segments.iptc;
    case 'c2pa': return r.segments.c2pa;
  }
}

export function cleanPanel(r: PhotoRecord, cs: CleanState, lossless: boolean) {
  const presets: [PresetId, string, string, boolean?][] = [
    ['all', 'Remove everything', 'All EXIF, GPS, IPTC, XMP and thumbnails. Best for sharing.', true],
    ['private', 'Remove private data', 'Remove location, identity, dates and device. Keep exposure settings.'],
    ['location', 'Remove location only', 'Delete GPS and place names; keep camera info.'],
    ['custom', 'Custom', 'Choose exactly what to remove.'],
  ];
  const result = cs.result;
  return `<div class="presets" role="radiogroup" aria-label="What to remove">${presets
    .map(([id, title, desc, rec]) => `<label class="preset"><input type="radio" name="preset" value="${id}" data-input="preset" ${cs.preset === id ? 'checked' : ''}><strong>${esc(title)}${rec ? '<span class="rec">Recommended</span>' : ''}</strong><span>${esc(desc)}</span></label>`)
    .join('')}</div>
    ${cs.preset === 'custom' ? `<fieldset class="checks" style="border:0"><legend class="visually-hidden">Metadata to remove</legend>${CATEGORY_INFO.map(([c, label, hint]) => {
      const present = categoryPresent(r, c);
      return `<label class="check ${present ? '' : 'absent'}"><input type="checkbox" data-input="cat" value="${c}" ${cs.custom.has(c) ? 'checked' : ''}><span><b>${esc(label)}</b>${present ? '<span class="found-tag">found</span>' : ''}<small>${esc(present ? hint : 'Not present in this photo')}</small></span></label>`;
    }).join('')}</fieldset>` : ''}
    <div class="opts">
      <label class="switch"><input type="checkbox" data-input="keepIcc" ${cs.keepIcc ? 'checked' : ''}> Keep color profile <span class="muted small">(recommended: keeps colors accurate)</span></label>
      <label class="switch"><input type="checkbox" data-input="keepOrientation" ${cs.keepOrientation ? 'checked' : ''}> Keep orientation <span class="muted small">(prevents sideways photos)</span></label>
    </div>
    ${lossless
      ? `<div class="alert alert-info">${icon('zap', 22)}<div><h3>Lossless cleaning</h3><p>Only metadata is removed. The image pixels are copied byte-for-byte, so there's no quality loss.</p></div></div>`
      : `<div class="alert alert-warn">${icon('info', 22)}<div><h3>This format will be converted</h3><p>${esc(r.format.toUpperCase())} can't be edited losslessly in the browser, so the cleaned copy is saved as a high-quality JPEG (or PNG for transparent images) with all metadata removed.</p></div></div>`}
    <div class="clean-cta">
      <button class="btn btn-primary btn-lg" data-action="clean" ${cs.busy ? 'disabled' : ''}>${cs.busy ? '<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> Cleaning…' : `${icon('download', 20)} Clean &amp; download`}</button>
      <span class="small muted">${icon('lock', 14).replace('class="icon ', 'style="display:inline;vertical-align:-2px" class="icon ')} Processed on your device. Nothing is uploaded.</span>
    </div>
    ${cs.error ? `<div class="alert alert-high" style="margin-top:16px">${icon('alert', 22)}<div><h3>Couldn't clean this photo</h3><p>${esc(cs.error)}</p></div></div>` : ''}
    ${result ? cleanResultCard(r, result.res, result.after) : ''}`;
}

function cleanResultCard(before: PhotoRecord, res: CleanResult, after: PhotoRecord) {
  const removed = Math.max(0, before.fields.length - after.fields.length);
  const gpsGone = !after.gps;
  return `<div class="result-card" role="status">
    <h3>${icon('checkCircle', 20)} Cleaned &amp; verified</h3>
    <p class="small" style="margin:0;color:var(--text-2)">We re-read the cleaned file to check what's left. ${gpsGone ? '<strong>No GPS location remains.</strong>' : '<strong>GPS location was kept</strong>, as you chose.'}</p>
    <div class="compare">
      <div><div class="k">Before</div><div class="v">${before.fields.length} fields · ${before.privacy.score}/100</div><div class="small muted">${formatBytes(before.size)}</div></div>
      ${icon('arrowRight', 20)}
      <div><div class="k">After</div><div class="v">${after.fields.length} fields · ${after.privacy.score}/100</div><div class="small muted">${formatBytes(res.blob.size)}</div></div>
    </div>
    <p class="small" style="margin:0 0 10px">${removed} metadata fields removed · ${res.method === 'lossless' ? 'lossless, no re-compression' : 're-encoded'} · saved as <span class="mono">${esc(res.name)}</span></p>
    ${res.notes.length ? `<ul class="notes">${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <div class="link-row" style="margin-top:12px">
      <button class="btn btn-sm btn-primary" data-action="download-clean">${icon('download', 16)} Download again</button>
      <button class="btn btn-sm" data-action="inspect-clean">${icon('search', 16)} Inspect cleaned file</button>
    </div>
  </div>
  ${offersHtml('afterClean', { title: 'Next steps' })}`;
}

// ------------------------------------------------------------------ batch
export type SortKey = 'name' | 'camera' | 'date' | 'iso' | 'gps' | 'score' | 'size';

export function batch(records: PhotoRecord[], sort: { key: SortKey; dir: 1 | -1 }, mode: string, preset: PresetId, busy: string) {
  const rows = records.map((r) => ({ r, s: summarize(r) }));
  const val = (x: (typeof rows)[number]): string | number => {
    switch (sort.key) {
      case 'name': return x.r.name.toLowerCase();
      case 'camera': return (x.s.camera ?? '').toLowerCase();
      case 'date': return x.s.taken?.getTime() ?? 0;
      case 'iso': return x.s.iso ?? 0;
      case 'gps': return x.r.gps ? 1 : 0;
      case 'score': return x.r.privacy.score;
      case 'size': return x.r.size;
    }
  };
  rows.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);

  const withGps = records.filter((r) => r.gps).length;
  const withSerial = records.filter((r) => r.privacy.findings.find((f) => f.id === 'serial')?.found).length;
  const withAuthor = records.filter((r) => r.privacy.findings.find((f) => f.id === 'author')?.found).length;
  const total = records.reduce((a, r) => a + r.size, 0);
  const hashes = new Map<string, number>();
  for (const r of records) if (r.hash) hashes.set(r.hash, (hashes.get(r.hash) ?? 0) + 1);
  const dupes = [...hashes.values()].filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);

  const th = (key: SortKey | null, label: string) =>
    key
      ? `<th scope="col" aria-sort="${sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}"><button data-action="sort" data-key="${key}">${esc(label)}${sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</button></th>`
      : `<th scope="col"><span style="display:block;padding:10px 12px">${esc(label)}</span></th>`;

  return `<div class="result-bar">
      <div class="title"><h2>${records.length} photo${records.length === 1 ? '' : 's'} analysed</h2><p>${formatBytes(total)} total · click a row for full details</p></div>
      <button class="btn btn-sm" data-action="add">${icon('plus', 18)} Add photos</button>
      <button class="btn btn-sm btn-ghost" data-action="new">${icon('trash', 18)} Clear</button>
    </div>
    <div class="stats">
      <div class="stat ${withGps ? 'alarm' : ''}"><div class="v">${withGps}</div><div class="k">with GPS location</div></div>
      <div class="stat ${withSerial ? 'alarm' : ''}"><div class="v">${withSerial}</div><div class="k">with serial numbers</div></div>
      <div class="stat"><div class="v">${withAuthor}</div><div class="k">with author / owner name</div></div>
      <div class="stat"><div class="v">${dupes}</div><div class="k">exact duplicates</div></div>
    </div>
    <div class="toolbar">
      <button class="btn ${mode === 'csv' ? 'btn-primary' : ''}" data-action="export-csv">${icon('table', 18)} Export CSV</button>
      <button class="btn" data-action="export-json">${icon('code', 18)} Export JSON</button>
      <span class="grow"></span>
      <label class="visually-hidden" for="batch-preset">Cleaning mode</label>
      <select id="batch-preset" class="btn" data-input="batch-preset" style="padding-right:8px">
        <option value="all" ${preset === 'all' ? 'selected' : ''}>Remove everything</option>
        <option value="private" ${preset === 'private' ? 'selected' : ''}>Remove private data</option>
        <option value="location" ${preset === 'location' ? 'selected' : ''}>Remove location only</option>
      </select>
      <button class="btn ${mode === 'csv' ? '' : 'btn-primary'}" data-action="clean-all" ${busy ? 'disabled' : ''}>${busy ? `<span class="spinner" style="width:18px;height:18px;border-width:2px"></span> ${esc(busy)}` : `${icon('download', 18)} Clean all (ZIP)`}</button>
    </div>
    <div class="table-wrap"><table class="batch-table">
      <thead><tr>${th(null, '')}${th('name', 'File')}${th('camera', 'Camera')}<th scope="col"><span style="display:block;padding:10px 12px">Lens</span></th>${th('date', 'Date taken')}${th('iso', 'ISO')}<th scope="col"><span style="display:block;padding:10px 12px">Exposure</span></th>${th('gps', 'GPS')}${th('score', 'Privacy')}</tr></thead>
      <tbody>${rows
        .map(({ r, s }) => `<tr data-action="open" data-id="${r.id}" tabindex="0">
          <td>${r.previewUrl ? `<img class="thumb" src="${r.thumbUrl ?? r.previewUrl}" alt="" decoding="async">` : `<div class="thumb"></div>`}</td>
          <td title="${esc(r.name)}"><strong>${esc(r.name)}</strong></td>
          <td>${esc(s.camera ?? '–')}</td>
          <td title="${esc(s.lens ?? '')}">${esc(s.lens ?? '–')}</td>
          <td>${s.taken ? esc(s.taken.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })) : '–'}</td>
          <td>${s.iso ?? '–'}</td>
          <td>${esc([s.aperture, s.shutter].filter(Boolean).join(' · ') || '–')}</td>
          <td>${r.gps ? `<span class="gps-yes">${icon('pin', 15)} Yes</span>` : '<span class="gps-no">No</span>'}</td>
          <td><span class="pill ${r.privacy.level}">${r.privacy.score}</span></td>
        </tr>`)
        .join('')}</tbody>
    </table></div>
    ${insights(records)}
    ${offersHtml('batch', { title: 'For photographers' })}
    ${withGps ? `<h3 class="section-title">${icon('map', 18)} Where these photos were taken (${withGps})</h3><div class="map-box big" data-map>${`<div class="optin">${icon('map', 30)}<strong>Show all photo locations on one map</strong><span>Loads map tiles from OpenStreetMap. Your photos are never sent.</span><button class="btn btn-primary btn-sm" data-action="map-optin">${icon('eye', 16)} Show map</button></div>`}</div>` : ''}`;
}

function topCounts(values: (string | number | undefined)[], n = 3): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) if (v !== undefined && v !== '') m.set(String(v), (m.get(String(v)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function insights(records: PhotoRecord[]) {
  if (records.length < 2) return '';
  const ss = records.map(summarize);
  const blocks: [string, [string, number][]][] = [
    ['Cameras', topCounts(ss.map((s) => s.camera))],
    ['Lenses', topCounts(ss.map((s) => s.lens))],
    ['ISO', topCounts(ss.map((s) => (s.iso ? `ISO ${s.iso}` : undefined)))],
    ['Apertures', topCounts(ss.map((s) => s.aperture))],
    ['Focal lengths', topCounts(ss.map((s) => (s.focal35 ? `${s.focal35} mm (35 mm eq.)` : s.focal)))],
  ].filter(([, v]) => (v as [string, number][]).length) as [string, [string, number][]][];
  if (!blocks.length) return '';
  return `<h3 class="section-title">${icon('sparkles', 18)} Gear &amp; settings statistics</h3><div class="insights">${blocks
    .map(([k, list]) => `<div class="tile"><div class="k">Most used: ${esc(k)}</div><ol>${list.map(([v, n]) => `<li>${esc(v)} <span class="muted">· ${n}</span></li>`).join('')}</ol></div>`)
    .join('')}</div>`;
}
