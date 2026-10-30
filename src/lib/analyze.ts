// Reads a photo entirely in the browser and builds a PhotoRecord.
import exifr from 'exifr';
import type { GpsInfo, PhotoRecord } from './types';
import { inspectContainer, sniffFormat, webpExifPayload } from './inspect';
import { buildFields } from './fields';
import { assessPrivacy } from './privacy';
import { extOf } from './format';

const NON_XMP = new Set(['ifd0', 'ifd1', 'exif', 'gps', 'interop', 'iptc', 'icc', 'jfif', 'ihdr', 'makerNote', 'userComment']);

const EXIFR_OPTIONS = {
  tiff: true,
  ifd0: true,
  exif: true,
  gps: true,
  interop: false,
  ifd1: false,
  xmp: true,
  iptc: true,
  icc: true,
  jfif: true,
  ihdr: true,
  makerNote: true,
  userComment: true,
  multiSegment: true,
  mergeOutput: false,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
  silentErrors: true,
};

const BROWSER_PREVIEWABLE = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

function dmsToDeg(v: any, ref: any): number | undefined {
  if (typeof v === 'number') return v;
  if (!Array.isArray(v) || v.length < 1) return undefined;
  const [d = 0, m = 0, s = 0] = v.map(Number);
  let deg = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') deg = -deg;
  return deg;
}

function readGps(raw: Record<string, any>): GpsInfo | undefined {
  const g = raw.gps;
  if (!g) return undefined;
  const lat = typeof g.latitude === 'number' ? g.latitude : dmsToDeg(g.GPSLatitude, g.GPSLatitudeRef);
  const lon = typeof g.longitude === 'number' ? g.longitude : dmsToDeg(g.GPSLongitude, g.GPSLongitudeRef);
  if (lat === undefined || lon === undefined || Number.isNaN(lat) || Number.isNaN(lon)) return undefined;
  if (lat === 0 && lon === 0) return undefined;
  const altRef = g.GPSAltitudeRef instanceof Uint8Array ? g.GPSAltitudeRef[0] : Number(g.GPSAltitudeRef);
  const alt = typeof g.GPSAltitude === 'number' ? (altRef === 1 ? -g.GPSAltitude : g.GPSAltitude) : undefined;
  let timestamp: string | undefined;
  if (g.GPSDateStamp) {
    const t = Array.isArray(g.GPSTimeStamp)
      ? g.GPSTimeStamp.map((n: number) => String(Math.floor(n)).padStart(2, '0')).join(':')
      : typeof g.GPSTimeStamp === 'string' ? g.GPSTimeStamp : '';
    timestamp = `${String(g.GPSDateStamp).replace(/:/g, '-')} ${t} UTC`.trim();
  }
  return { lat, lon, alt, direction: typeof g.GPSImgDirection === 'number' ? g.GPSImgDirection : undefined, timestamp };
}

async function sha256(buf: Uint8Array): Promise<string | undefined> {
  try {
    const d = await crypto.subtle.digest('SHA-256', buf as unknown as BufferSource);
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

let counter = 0;

export async function analyzeFile(file: File): Promise<PhotoRecord> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const format = sniffFormat(buf);
  const { segments, tech } = inspectContainer(buf, format);

  let raw: Record<string, any> = {};
  try {
    const source = format === 'webp' ? webpExifPayload(buf) : buf;
    raw = source ? ((await exifr.parse(source, EXIFR_OPTIONS as any)) ?? {}) : {};
  } catch {
    raw = {};
  }

  const makerNote = raw.exif?.MakerNote ?? raw.makerNote;
  if (makerNote) {
    segments.makerNote = true;
    if (raw.exif) delete raw.exif.MakerNote;
    delete raw.makerNote;
  }

  let thumbUrl: string | undefined;
  try {
    const thumb = format === 'webp' ? undefined : await exifr.thumbnail(buf);
    if (thumb && thumb.byteLength > 0) {
      segments.thumbnail = true;
      thumbUrl = URL.createObjectURL(new Blob([thumb as BlobPart], { type: 'image/jpeg' }));
    }
  } catch {
    /* no thumbnail */
  }

  const gps = readGps(raw);
  segments.gps = !!gps;
  if (raw.ifd0 || raw.exif) segments.exif = true;
  if (raw.iptc) segments.iptc = true;
  if (raw.icc) segments.icc = true;
  if (Object.keys(raw).some((k) => !NON_XMP.has(k))) segments.xmp = true;

  // Fill technical gaps from metadata.
  tech.width ??= raw.exif?.ExifImageWidth ?? raw.ifd0?.ImageWidth ?? raw.ihdr?.ImageWidth;
  tech.height ??= raw.exif?.ExifImageHeight ?? raw.ifd0?.ImageHeight ?? raw.ihdr?.ImageHeight;
  tech.iccName ??= raw.icc?.ProfileDescription ?? raw.icc?.ProfileDescriptionTag;
  if (tech.dpiX === undefined && typeof raw.ifd0?.XResolution === 'number' && /inch/i.test(String(raw.ifd0?.ResolutionUnit ?? 'inches'))) {
    tech.dpiX = Math.round(raw.ifd0.XResolution);
    tech.dpiY = Math.round(raw.ifd0.YResolution ?? raw.ifd0.XResolution);
  }

  let previewUrl: string | undefined;
  const canTry = BROWSER_PREVIEWABLE.has(format) || format === 'heic' || format === 'tiff';
  if (canTry) previewUrl = URL.createObjectURL(file);
  if (!tech.width && 'createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      tech.width = bmp.width;
      tech.height = bmp.height;
      bmp.close();
    } catch {
      /* browser cannot decode (e.g. HEIC in Chrome) */
    }
  }

  const fields = buildFields(raw);
  const privacy = assessPrivacy(raw, segments, gps);

  return {
    id: `p${++counter}`,
    file,
    name: file.name || 'photo',
    size: file.size,
    mime: file.type || (format === 'heic' ? 'image/heic' : 'application/octet-stream'),
    ext: extOf(file.name),
    format,
    previewUrl,
    thumbUrl,
    tech,
    segments,
    raw,
    gps,
    fields,
    privacy,
    hash: await sha256(buf),
  };
}

export function releaseRecord(r: PhotoRecord) {
  if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
  if (r.thumbUrl) URL.revokeObjectURL(r.thumbUrl);
}
