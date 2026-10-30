// Metadata removal. JPEG, PNG and WebP are cleaned losslessly (the image data
// is copied byte-for-byte; only metadata blocks change). Other formats are
// re-encoded through a canvas, which drops all metadata.
import piexif from 'piexifjs';
import type { CleanCategory, CleanOptions, PhotoRecord } from './types';
import { jpegAppKind, jpegSegments } from './inspect';
import { LOCATION_TEXT_IPTC } from './privacy';
import { baseName } from './format';

export const ALL_CATEGORIES: CleanCategory[] = [
  'gps', 'device', 'serial', 'datetime', 'software', 'author', 'description', 'thumbnail', 'settings', 'xmp', 'iptc', 'c2pa',
];

/** Categories that live in the EXIF block. */
const EXIF_CATS: CleanCategory[] = ['gps', 'device', 'serial', 'datetime', 'software', 'author', 'description', 'thumbnail', 'settings'];

export const PRESETS: Record<string, CleanCategory[]> = {
  all: ALL_CATEGORIES,
  private: ['gps', 'serial', 'datetime', 'author', 'description', 'thumbnail', 'software', 'xmp', 'iptc', 'c2pa', 'device'],
  location: ['gps'],
};

export interface CleanResult {
  blob: Blob;
  name: string;
  method: 'lossless' | 'reencoded';
  notes: string[];
}

// ---------------------------------------------------------------- helpers
function u8ToBin(u8: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000) as unknown as number[]);
  return s;
}
function binToU8(s: string): Uint8Array {
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i) & 0xff;
  return u8;
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
const has = (opts: CleanOptions, ...cats: CleanCategory[]) => cats.some((c) => opts.remove.has(c));

// --------------------------------------------------------------- EXIF tags
const EXIF_TAGS: Partial<Record<CleanCategory, { '0th'?: number[]; Exif?: number[]; GPS?: number[] }>> = {
  device: { '0th': [271, 272, 316], Exif: [42034, 42035, 42036] },
  serial: { '0th': [50735], Exif: [42033, 42037, 42016, 37500] },
  datetime: { '0th': [306], Exif: [36867, 36868, 36880, 36881, 36882, 37520, 37521, 37522], GPS: [7, 29] },
  software: { '0th': [305, 11, 316] },
  author: { '0th': [315, 33432, 40093], Exif: [42032] },
  description: { '0th': [270, 269, 40091, 40092, 40094, 40095], Exif: [37510] },
  settings: {
    Exif: [33434, 33437, 34850, 34852, 34855, 34856, 34864, 34865, 34866, 34867, 37377, 37378, 37379, 37380, 37381, 37382,
      37383, 37384, 37385, 37386, 37396, 41483, 41486, 41487, 41488, 41492, 41495, 41728, 41729, 41985, 41986, 41987, 41988,
      41989, 41990, 41991, 41992, 41993, 41994, 41996, 37500],
  },
};

function editExif(payload: string, opts: CleanOptions, orientation?: number): string | null {
  const removeAllExif = EXIF_CATS.every((c) => opts.remove.has(c));
  if (removeAllExif) {
    return opts.keepOrientation && orientation && orientation !== 1 ? piexif.dump({ '0th': { 274: orientation } }) : null;
  }
  const obj = piexif.load(payload);
  if (opts.remove.has('gps')) obj.GPS = {};
  if (opts.remove.has('thumbnail')) {
    obj['1st'] = {};
    obj.thumbnail = null;
  }
  for (const cat of opts.remove) {
    const tags = EXIF_TAGS[cat];
    if (!tags) continue;
    for (const ifd of ['0th', 'Exif', 'GPS'] as const) for (const t of tags[ifd] ?? []) delete obj[ifd]?.[t];
  }
  const POINTERS = new Set(['274', '34665', '34853', '40965']);
  const empty = ['0th', 'Exif', 'GPS'].every((k) => Object.keys(obj[k] ?? {}).filter((t) => !POINTERS.has(t)).length === 0) && !obj.thumbnail;
  if (empty) return opts.keepOrientation && orientation && orientation !== 1 ? piexif.dump({ '0th': { 274: orientation } }) : null;
  return piexif.dump(obj);
}

function app1(payload: string): Uint8Array {
  const data = binToU8(payload);
  const len = data.length + 2;
  if (len > 0xffff) throw new Error('EXIF too large');
  return concat([new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff]), data]);
}

/** Size of the primary image when an MPF (multi-picture) index is present. */
function mpfPrimaryEnd(b: Uint8Array, dataStart: number): number | undefined {
  const base = dataStart + 4; // after "MPF\0"
  const le = b[base] === 0x49;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = (o: number) => dv.getUint16(base + o, le);
  const u32 = (o: number) => dv.getUint32(base + o, le);
  const ifd = u32(4);
  const n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (u16(e) === 0xb002) {
      const off = u32(e + 8);
      const size = u32(off + 4);
      return size > 0 && size <= b.length ? size : undefined;
    }
  }
  return undefined;
}

// --------------------------------------------------------------- JPEG
const XMP_PATTERNS: Partial<Record<CleanCategory, RegExp>> = {
  gps: /GPS|photoshop:(City|State|Country)|Iptc4xmp(Core|Ext):Location/i,
  serial: /SerialNumber|ImageUniqueID/i,
  author: /dc:creator|dc:rights|Artist|Copyright|Owner|CreatorContactInfo/i,
  datetime: /Date/i,
  description: /dc:description|dc:title|dc:subject|Keywords|Headline/i,
  software: /CreatorTool|Software/i,
  device: /tiff:Make|tiff:Model|aux:Lens/i,
};

function cleanJpeg(b: Uint8Array, rec: PhotoRecord, opts: CleanOptions, notes: string[]): Uint8Array {
  const { segments, sos } = jpegSegments(b);
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let end = b.length;
  let orientation: number | undefined;
  const iptc = rec.raw.iptc ?? {};
  const iptcHits = (cat: CleanCategory) => {
    const keys: Record<string, string[]> = {
      gps: LOCATION_TEXT_IPTC,
      author: ['Byline', 'BylineTitle', 'Credit', 'Source', 'CopyrightNotice', 'Contact', 'Writer'],
      description: ['Caption', 'Headline', 'Keywords', 'ObjectName', 'SpecialInstructions'],
      datetime: ['DateCreated', 'TimeCreated', 'DigitalCreationDate', 'DigitalCreationTime'],
    };
    return (keys[cat] ?? []).some((k) => k in iptc);
  };
  let xmpDroppedFor: string[] = [];

  for (const s of segments) {
    const seg = b.subarray(s.start, s.end);
    const kind = jpegAppKind(b, s);
    switch (kind) {
      case 'exif': {
        if (!EXIF_CATS.some((c) => opts.remove.has(c))) {
          out.push(seg);
          break;
        }
        const payload = u8ToBin(b.subarray(s.dataStart, s.end));
        try {
          orientation = piexif.load(payload)['0th']?.[274];
        } catch {
          /* unreadable EXIF: orientation unknown */
        }
        try {
          const edited = editExif(payload, opts, orientation);
          if (edited) out.push(app1(edited));
        } catch {
          notes.push('This file’s EXIF block could not be edited selectively, so all EXIF data was removed to be safe.');
          if (opts.keepOrientation && orientation && orientation !== 1) out.push(app1(piexif.dump({ '0th': { 274: orientation } })));
        }
        break;
      }
      case 'xmp':
      case 'xmpext': {
        const text = u8ToBin(b.subarray(s.dataStart, s.end));
        const reasons = opts.remove.has('xmp')
          ? ['xmp']
          : (Object.keys(XMP_PATTERNS) as CleanCategory[]).filter((c) => opts.remove.has(c) && XMP_PATTERNS[c]!.test(text));
        if (reasons.length) xmpDroppedFor = [...new Set([...xmpDroppedFor, ...reasons])];
        else out.push(seg);
        break;
      }
      case 'iptc': {
        const drop = opts.remove.has('iptc') || (['gps', 'author', 'description', 'datetime'] as CleanCategory[]).some((c) => opts.remove.has(c) && iptcHits(c));
        if (!drop) out.push(seg);
        else if (!opts.remove.has('iptc')) notes.push('The IPTC block was removed because it also contained data you chose to remove.');
        break;
      }
      case 'icc':
        if (opts.keepIcc) out.push(seg);
        break;
      case 'mpf': {
        const primary = mpfPrimaryEnd(b, s.dataStart);
        if (primary) end = primary;
        notes.push('Secondary embedded images (e.g. HDR gain map or depth map) were removed, because they carry their own metadata.');
        break;
      }
      case 'jumbf':
        if (!opts.remove.has('c2pa')) out.push(seg);
        break;
      case 'comment':
        if (!opts.remove.has('description')) out.push(seg);
        break;
      case 'jfxx':
        if (!opts.remove.has('thumbnail')) out.push(seg);
        break;
      case 'jfif':
      case 'adobe':
      case 'other':
        out.push(seg);
        break;
      default:
        // Unknown APPn segments (vendor data such as Ducky, Meta, maker blobs) are
        // never needed to decode the image and may contain metadata.
        break;
    }
  }
  if (xmpDroppedFor.length && !opts.remove.has('xmp')) {
    notes.push('The XMP block was removed because it duplicated data you chose to remove.');
  }
  out.push(b.subarray(sos, end));
  return concat(out);
}

// --------------------------------------------------------------- PNG
function cleanPng(b: Uint8Array, opts: CleanOptions, notes: string[]): Uint8Array {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: Uint8Array[] = [b.subarray(0, 8)];
  const textCats: CleanCategory[] = ['xmp', 'description', 'author', 'software', 'datetime', 'gps', 'serial', 'device'];
  let p = 8;
  while (p + 12 <= b.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    const chunk = b.subarray(p, p + 12 + len);
    let keep = true;
    if (type === 'eXIf') keep = !EXIF_CATS.some((c) => opts.remove.has(c));
    else if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') keep = !has(opts, ...textCats);
    else if (type === 'tIME') keep = !opts.remove.has('datetime');
    else if (type === 'iCCP') keep = opts.keepIcc;
    else if (type === 'caBX') keep = !opts.remove.has('c2pa');
    if (keep) out.push(chunk);
    p += 12 + len;
    if (type === 'IEND') break;
  }
  if (EXIF_CATS.some((c) => opts.remove.has(c))) notes.push('PNG files store EXIF as a single block, so it is removed as a whole.');
  return concat(out);
}

// --------------------------------------------------------------- WebP
function cleanWebp(b: Uint8Array, opts: CleanOptions, notes: string[]): Uint8Array {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: Uint8Array[] = [];
  let vp8x: Uint8Array | null = null;
  let p = 12;
  const dropExif = EXIF_CATS.some((c) => opts.remove.has(c));
  const dropXmp = has(opts, 'xmp', 'description', 'author', 'software', 'datetime', 'gps', 'serial', 'device');
  while (p + 8 <= b.length) {
    const type = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]);
    const len = dv.getUint32(p + 4, true);
    const full = 8 + len + (len & 1);
    const chunk = b.slice(p, p + full);
    let keep = true;
    if (type === 'EXIF') keep = !dropExif;
    else if (type === 'XMP ') keep = !dropXmp;
    else if (type === 'ICCP') keep = opts.keepIcc;
    if (type === 'VP8X') vp8x = chunk;
    if (keep) chunks.push(chunk);
    p += full;
  }
  if (vp8x) {
    let flags = vp8x[8];
    if (dropExif) flags &= ~0x08;
    if (dropXmp) flags &= ~0x04;
    if (!opts.keepIcc) flags &= ~0x20;
    vp8x[8] = flags;
  }
  if (dropExif) notes.push('WebP files store EXIF as a single block, so it is removed as a whole.');
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46]);
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set([0x57, 0x45, 0x42, 0x50], 8);
  return concat([header, body]);
}

// --------------------------------------------------------------- re-encode
async function reencode(rec: PhotoRecord, notes: string[]): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(rec.file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    throw new Error(
      rec.format === 'heic'
        ? 'Your browser can’t decode HEIC images. Open this page in Safari (Mac/iPhone) or export the photo as JPEG first.'
        : 'Your browser can’t decode this image format.',
    );
  }
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  const type = rec.tech.hasAlpha ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92));
  if (!blob) throw new Error('Could not encode the cleaned image.');
  notes.push(`Converted to ${type === 'image/png' ? 'PNG' : 'JPEG (quality 92)'} because ${rec.format.toUpperCase()} can’t be edited losslessly in the browser. All metadata is removed.`);
  return blob;
}

export function canCleanLossless(rec: PhotoRecord) {
  return rec.format === 'jpeg' || rec.format === 'png' || rec.format === 'webp';
}

export async function cleanPhoto(rec: PhotoRecord, opts: CleanOptions): Promise<CleanResult> {
  const notes: string[] = [];
  const base = baseName(rec.name);
  if (canCleanLossless(rec)) {
    const b = new Uint8Array(await rec.file.arrayBuffer());
    const out = rec.format === 'jpeg' ? cleanJpeg(b, rec, opts, notes) : rec.format === 'png' ? cleanPng(b, opts, notes) : cleanWebp(b, opts, notes);
    return {
      blob: new Blob([out as BlobPart], { type: rec.mime || `image/${rec.format}` }),
      name: `${base}-clean.${rec.ext || (rec.format === 'jpeg' ? 'jpg' : rec.format)}`,
      method: 'lossless',
      notes: [...new Set(notes)],
    };
  }
  if (rec.format === 'gif') throw new Error('GIF cleaning is not supported yet. GIFs rarely contain personal metadata.');
  const blob = await reencode(rec, notes);
  return { blob, name: `${base}-clean.${blob.type === 'image/png' ? 'png' : 'jpg'}`, method: 'reencoded', notes };
}
