// Low-level, dependency-free inspection of image containers: format sniffing,
// dimensions, compression details and which metadata blocks are present.
import type { ImageFormat, SegmentMap, TechInfo } from './types';

export function emptySegments(): SegmentMap {
  return {
    exif: false, gps: false, iptc: false, xmp: false, icc: false, thumbnail: false,
    makerNote: false, comment: false, c2pa: false, mpf: false, textChunks: false,
  };
}

const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.subarray(start, Math.min(b.length, start + len)));

export function sniffFormat(b: Uint8Array): ImageFormat {
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpeg';
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (ascii(b, 0, 3) === 'GIF') return 'gif';
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[3] === 0x2a)) return 'tiff';
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4);
    if (brand.startsWith('avi')) return 'avif';
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'heic';
  }
  return 'unknown';
}

// IJG standard luminance quantisation table, used to estimate JPEG quality.
const STD_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];
const STD_SUM = STD_LUMA.reduce((a, b) => a + b, 0);

function estimateQuality(table: number[]): number {
  const s = (table.reduce((a, b) => a + b, 0) / STD_SUM) * 100;
  const q = s <= 100 ? (200 - s) / 2 : 5000 / s;
  return Math.max(1, Math.min(100, Math.round(q)));
}

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export interface JpegSegment {
  marker: number;
  start: number; // offset of 0xFF
  end: number; // offset after the segment
  dataStart: number; // offset of payload (after length)
}

/** Walk JPEG marker segments up to (not including) the first SOS. */
export function jpegSegments(b: Uint8Array): { segments: JpegSegment[]; sos: number } {
  const segments: JpegSegment[] = [];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error('Corrupt JPEG: marker expected');
    let marker = b[i + 1];
    while (marker === 0xff) {
      i++;
      marker = b[i + 1];
    }
    if (marker === 0xda) return { segments, sos: i };
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    segments.push({ marker, start: i, end: i + 2 + len, dataStart: i + 4 });
    i += 2 + len;
  }
  return { segments, sos: b.length };
}

export function jpegAppKind(b: Uint8Array, s: JpegSegment): string {
  const id = ascii(b, s.dataStart, 36);
  if (s.marker === 0xe0) return id.startsWith('JFIF') ? 'jfif' : id.startsWith('JFXX') ? 'jfxx' : 'app0';
  if (s.marker === 0xe1) {
    if (id.startsWith('Exif')) return 'exif';
    if (id.startsWith('http://ns.adobe.com/xap/1.0/')) return 'xmp';
    if (id.startsWith('http://ns.adobe.com/xmp/extension/')) return 'xmpext';
    return 'app1';
  }
  if (s.marker === 0xe2) return id.startsWith('ICC_PROFILE') ? 'icc' : id.startsWith('MPF') ? 'mpf' : 'app2';
  if (s.marker === 0xeb) return 'jumbf';
  if (s.marker === 0xed) return id.startsWith('Photoshop 3.0') ? 'iptc' : 'app13';
  if (s.marker === 0xee) return id.startsWith('Adobe') ? 'adobe' : 'app14';
  if (s.marker === 0xfe) return 'comment';
  if (s.marker >= 0xe0 && s.marker <= 0xef) return `app${s.marker - 0xe0}`;
  return 'other';
}

function inspectJpeg(b: Uint8Array, seg: SegmentMap, tech: TechInfo) {
  const { segments } = jpegSegments(b);
  for (const s of segments) {
    const kind = jpegAppKind(b, s);
    switch (kind) {
      case 'jfif': {
        const units = b[s.dataStart + 7];
        const x = (b[s.dataStart + 8] << 8) | b[s.dataStart + 9];
        const y = (b[s.dataStart + 10] << 8) | b[s.dataStart + 11];
        if (units === 1) Object.assign(tech, { dpiX: x, dpiY: y });
        else if (units === 2) Object.assign(tech, { dpiX: Math.round(x * 2.54), dpiY: Math.round(y * 2.54) });
        break;
      }
      case 'exif': seg.exif = true; break;
      case 'xmp': case 'xmpext': seg.xmp = true; break;
      case 'icc': seg.icc = true; break;
      case 'mpf': seg.mpf = true; break;
      case 'iptc': seg.iptc = true; break;
      case 'comment': seg.comment = true; break;
      case 'jumbf':
        if (ascii(b, s.dataStart, Math.min(200, s.end - s.dataStart)).includes('c2pa')) seg.c2pa = true;
        break;
    }
    if (s.marker === 0xdb) {
      // DQT: may contain several tables
      let p = s.dataStart;
      while (p < s.end) {
        const pq = b[p] >> 4;
        const tq = b[p] & 0x0f;
        const n = pq ? 128 : 64;
        if (tq === 0 && tech.quality === undefined) {
          const t: number[] = [];
          for (let k = 0; k < 64; k++) t.push(pq ? (b[p + 1 + k * 2] << 8) | b[p + 2 + k * 2] : b[p + 1 + k]);
          tech.quality = estimateQuality(t);
        }
        p += 1 + n;
      }
    }
    if (SOF.has(s.marker)) {
      const d = s.dataStart;
      tech.bitDepth = b[d];
      tech.height = (b[d + 1] << 8) | b[d + 2];
      tech.width = (b[d + 3] << 8) | b[d + 4];
      tech.components = b[d + 5];
      tech.progressive = s.marker === 0xc2 || s.marker === 0xc6 || s.marker === 0xca || s.marker === 0xce;
      tech.lossless = s.marker === 0xc3;
      tech.colorModel = { 1: 'Grayscale', 3: 'YCbCr (color)', 4: 'CMYK' }[tech.components] ?? `${tech.components} channels`;
      if (tech.components === 3) {
        const h0 = b[d + 7] >> 4, v0 = b[d + 7] & 15;
        const h1 = b[d + 10] >> 4, v1 = b[d + 10] & 15;
        const key = `${h0 / h1}x${v0 / v1}`;
        tech.subsampling = { '1x1': '4:4:4', '2x1': '4:2:2', '2x2': '4:2:0', '1x2': '4:4:0', '4x1': '4:1:1' }[key] ?? key;
      }
    }
  }
}

function inspectPng(b: Uint8Array, seg: SegmentMap, tech: TechInfo) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 8;
  while (p + 8 <= b.length) {
    const len = dv.getUint32(p);
    const type = ascii(b, p + 4, 4);
    const d = p + 8;
    if (type === 'IHDR') {
      tech.width = dv.getUint32(d);
      tech.height = dv.getUint32(d + 4);
      tech.bitDepth = b[d + 8];
      const ct = b[d + 9];
      tech.hasAlpha = ct === 4 || ct === 6;
      tech.colorModel = { 0: 'Grayscale', 2: 'RGB', 3: 'Indexed (palette)', 4: 'Grayscale + alpha', 6: 'RGBA' }[ct] ?? `type ${ct}`;
      tech.lossless = true;
    } else if (type === 'pHYs' && b[d + 8] === 1) {
      tech.dpiX = Math.round(dv.getUint32(d) * 0.0254);
      tech.dpiY = Math.round(dv.getUint32(d + 4) * 0.0254);
    } else if (type === 'iCCP') {
      seg.icc = true;
      let e = d;
      while (b[e] !== 0 && e < d + 80) e++;
      tech.iccName = ascii(b, d, e - d);
    } else if (type === 'eXIf') {
      seg.exif = true;
    } else if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
      if (ascii(b, d, 17) === 'XML:com.adobe.xmp') seg.xmp = true;
      else seg.textChunks = true;
    } else if (type === 'tIME') {
      seg.textChunks = true;
    } else if (type === 'caBX') {
      seg.c2pa = true;
    } else if (type === 'tRNS') {
      tech.hasAlpha = true;
    } else if (type === 'acTL') {
      tech.animated = true;
    } else if (type === 'IEND') break;
    p = d + len + 4;
  }
}

function inspectWebp(b: Uint8Array, seg: SegmentMap, tech: TechInfo) {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 12;
  while (p + 8 <= b.length) {
    const type = ascii(b, p, 4);
    const len = dv.getUint32(p + 4, true);
    const d = p + 8;
    if (type === 'VP8X') {
      const flags = b[d];
      tech.hasAlpha = !!(flags & 0x10);
      tech.animated = !!(flags & 0x02);
      tech.width = 1 + (b[d + 4] | (b[d + 5] << 8) | (b[d + 6] << 16));
      tech.height = 1 + (b[d + 7] | (b[d + 8] << 8) | (b[d + 9] << 16));
    } else if (type === 'VP8 ' && !tech.width) {
      tech.width = dv.getUint16(d + 6, true) & 0x3fff;
      tech.height = dv.getUint16(d + 8, true) & 0x3fff;
      tech.lossless = false;
    } else if (type === 'VP8L') {
      if (!tech.width) {
        const v = dv.getUint32(d + 1, true);
        tech.width = (v & 0x3fff) + 1;
        tech.height = ((v >> 14) & 0x3fff) + 1;
      }
      tech.lossless = true;
    } else if (type === 'ICCP') seg.icc = true;
    else if (type === 'EXIF') seg.exif = true;
    else if (type === 'XMP ') seg.xmp = true;
    p = d + len + (len & 1);
  }
  tech.colorModel = tech.hasAlpha ? 'RGBA' : 'RGB';
}

/** exifr can't read WebP, so hand it the EXIF chunk's TIFF payload directly. */
export function webpExifPayload(b: Uint8Array): Uint8Array | undefined {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 12;
  while (p + 8 <= b.length) {
    const type = ascii(b, p, 4);
    const len = dv.getUint32(p + 4, true);
    if (type === 'EXIF') {
      let d = b.subarray(p + 8, p + 8 + len);
      if (ascii(d, 0, 4) === 'Exif') d = d.subarray(6);
      return d;
    }
    p += 8 + len + (len & 1);
  }
  return undefined;
}

export function inspectContainer(b: Uint8Array, format: ImageFormat): { segments: SegmentMap; tech: TechInfo } {
  const segments = emptySegments();
  const tech: TechInfo = {};
  try {
    if (format === 'jpeg') inspectJpeg(b, segments, tech);
    else if (format === 'png') inspectPng(b, segments, tech);
    else if (format === 'webp') inspectWebp(b, segments, tech);
    else if (format === 'gif') {
      tech.width = b[6] | (b[7] << 8);
      tech.height = b[8] | (b[9] << 8);
      tech.colorModel = 'Indexed (palette)';
      tech.lossless = true;
    }
  } catch {
    // A damaged container still gets whatever we managed to read.
  }
  return { segments, tech };
}
