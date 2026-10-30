// Turns exifr's raw output into labelled, grouped, human-readable fields.
import type { Field, GroupId } from './types';
import { formatDate, formatExposure } from './format';

type Def = [label: string, group: GroupId, sensitive?: boolean];

const DEFS: Record<string, Def> = {
  // device / camera
  Make: ['Camera make', 'camera'],
  Model: ['Camera model', 'camera'],
  LensMake: ['Lens make', 'camera'],
  LensModel: ['Lens model', 'camera'],
  LensInfo: ['Lens specification', 'camera'],
  BodySerialNumber: ['Camera serial number', 'camera', true],
  SerialNumber: ['Camera serial number', 'camera', true],
  LensSerialNumber: ['Lens serial number', 'camera', true],
  InternalSerialNumber: ['Internal serial number', 'camera', true],
  ImageUniqueID: ['Unique image ID', 'camera', true],
  OwnerName: ['Camera owner name', 'author', true],
  CameraOwnerName: ['Camera owner name', 'author', true],
  HostComputer: ['Device', 'camera'],
  // settings
  ExposureTime: ['Shutter speed', 'settings'],
  FNumber: ['Aperture', 'settings'],
  ISO: ['ISO', 'settings'],
  ISOSpeedRatings: ['ISO', 'settings'],
  ExposureProgram: ['Exposure program', 'settings'],
  ExposureMode: ['Exposure mode', 'settings'],
  ExposureCompensation: ['Exposure compensation', 'settings'],
  MeteringMode: ['Metering mode', 'settings'],
  Flash: ['Flash', 'settings'],
  FocalLength: ['Focal length', 'settings'],
  FocalLengthIn35mmFormat: ['Focal length (35 mm equiv.)', 'settings'],
  WhiteBalance: ['White balance', 'settings'],
  SceneCaptureType: ['Scene type', 'settings'],
  SceneType: ['Scene source', 'settings'],
  DigitalZoomRatio: ['Digital zoom', 'settings'],
  BrightnessValue: ['Brightness value', 'settings'],
  ShutterSpeedValue: ['Shutter speed value (APEX)', 'settings'],
  ApertureValue: ['Aperture value (APEX)', 'settings'],
  MaxApertureValue: ['Max aperture (APEX)', 'settings'],
  LightSource: ['Light source', 'settings'],
  SensingMethod: ['Sensing method', 'settings'],
  Contrast: ['Contrast', 'settings'],
  Saturation: ['Saturation', 'settings'],
  Sharpness: ['Sharpness', 'settings'],
  SubjectDistanceRange: ['Subject distance', 'settings'],
  // image
  Orientation: ['Orientation', 'image'],
  XResolution: ['Horizontal resolution', 'image'],
  YResolution: ['Vertical resolution', 'image'],
  ResolutionUnit: ['Resolution unit', 'image'],
  ColorSpace: ['Color space', 'image'],
  ExifImageWidth: ['Image width (EXIF)', 'image'],
  ExifImageHeight: ['Image height (EXIF)', 'image'],
  ImageWidth: ['Image width', 'image'],
  ImageHeight: ['Image height', 'image'],
  BitsPerSample: ['Bits per sample', 'image'],
  Compression: ['Compression', 'image'],
  YCbCrPositioning: ['YCbCr positioning', 'image'],
  ComponentsConfiguration: ['Components', 'image'],
  // dates
  DateTimeOriginal: ['Date taken', 'datetime', true],
  CreateDate: ['Date digitized', 'datetime', true],
  ModifyDate: ['Date modified', 'datetime', true],
  OffsetTime: ['Time zone (modified)', 'datetime', true],
  OffsetTimeOriginal: ['Time zone (taken)', 'datetime', true],
  OffsetTimeDigitized: ['Time zone (digitized)', 'datetime', true],
  SubSecTimeOriginal: ['Sub-second (taken)', 'datetime'],
  SubSecTimeDigitized: ['Sub-second (digitized)', 'datetime'],
  SubSecTime: ['Sub-second (modified)', 'datetime'],
  // location
  latitude: ['Latitude', 'location', true],
  longitude: ['Longitude', 'location', true],
  GPSLatitude: ['GPS latitude (raw)', 'location', true],
  GPSLongitude: ['GPS longitude (raw)', 'location', true],
  GPSLatitudeRef: ['Latitude ref', 'location', true],
  GPSLongitudeRef: ['Longitude ref', 'location', true],
  GPSAltitude: ['Altitude', 'location', true],
  GPSAltitudeRef: ['Altitude ref', 'location'],
  GPSImgDirection: ['Camera direction', 'location', true],
  GPSImgDirectionRef: ['Direction ref', 'location'],
  GPSDestBearing: ['Destination bearing', 'location'],
  GPSSpeed: ['Speed', 'location', true],
  GPSSpeedRef: ['Speed unit', 'location'],
  GPSDateStamp: ['GPS date', 'location', true],
  GPSTimeStamp: ['GPS time (UTC)', 'location', true],
  GPSHPositioningError: ['Position accuracy', 'location'],
  GPSVersionID: ['GPS version', 'location'],
  // author
  Artist: ['Artist / author', 'author', true],
  Copyright: ['Copyright', 'author', true],
  XPAuthor: ['Author (Windows)', 'author', true],
  ImageDescription: ['Description', 'author', true],
  UserComment: ['User comment', 'author', true],
  XPComment: ['Comment (Windows)', 'author', true],
  XPKeywords: ['Keywords (Windows)', 'author', true],
  XPSubject: ['Subject (Windows)', 'author', true],
  XPTitle: ['Title (Windows)', 'author', true],
  // software
  Software: ['Software', 'software'],
  ProcessingSoftware: ['Processing software', 'software'],
  ExifVersion: ['EXIF version', 'software'],
  FlashpixVersion: ['FlashPix version', 'software'],
};

const IPTC_SENSITIVE = new Set([
  'Byline', 'BylineTitle', 'Credit', 'Source', 'Contact', 'City', 'Sublocation', 'State', 'ProvinceState',
  'Country', 'CountryCode', 'CountryPrimaryLocationName', 'CopyrightNotice', 'Caption', 'Writer',
]);

const SKIP = new Set(['MakerNote', 'ThumbnailOffset', 'ThumbnailLength', 'PrintIM', 'GPSLatitudeRef', 'GPSLongitudeRef']);

function humanize(key: string): string {
  return key
    .replace(/^GPS/, 'GPS ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export function formatValue(key: string, v: any): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return formatDate(v);
  if (v instanceof Uint8Array && v.length <= 8) return Array.from(v).join(', ');
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return `(binary data, ${(v as Uint8Array).byteLength} bytes)`;
  switch (key) {
    case 'ExposureTime': return formatExposure(+v);
    case 'FNumber': return `f/${+(+v).toFixed(1)}`;
    case 'FocalLength': return `${+(+v).toFixed(2)} mm`;
    case 'FocalLengthIn35mmFormat': return `${v} mm`;
    case 'ExposureCompensation': return `${+v > 0 ? '+' : ''}${+(+v).toFixed(2)} EV`;
    case 'GPSAltitude': return `${+(+v).toFixed(1)} m`;
    case 'GPSImgDirection': return `${+(+v).toFixed(1)}°`;
    case 'latitude': case 'longitude': return (+v).toFixed(6);
    case 'GPSTimeStamp': return Array.isArray(v) ? v.map((n: number) => String(Math.floor(n)).padStart(2, '0')).join(':') : String(v);
  }
  if (Array.isArray(v)) {
    if (v.length > 24) return `(${v.length} values)`;
    return v.map((x) => (typeof x === 'number' ? +x.toFixed(4) : typeof x === 'object' ? JSON.stringify(x) : x)).join(', ');
  }
  if (typeof v === 'number') return String(+v.toFixed(4));
  if (typeof v === 'object') {
    if ('value' in v && Object.keys(v).length <= 2) return String(v.value);
    const s = JSON.stringify(v);
    return s.length > 300 ? s.slice(0, 300) + '…' : s;
  }
  const s = String(v).replace(/\0+$/, '').trim();
  return s.length > 600 ? s.slice(0, 600) + '…' : s;
}

const BLOCK_GROUP: Record<string, GroupId> = {
  ifd0: 'other', exif: 'settings', gps: 'location', interop: 'other', iptc: 'iptc', icc: 'icc', jfif: 'image', ihdr: 'image',
};

/** Flatten exifr output (mergeOutput:false) into a de-duplicated field list. */
export function buildFields(raw: Record<string, any>): Field[] {
  const out: Field[] = [];
  const seen = new Set<string>();
  const push = (key: string, value: any, group: GroupId, label?: string, sensitive?: boolean) => {
    if (SKIP.has(key)) return;
    const formatted = formatValue(key, value);
    if (!formatted) return;
    const def = DEFS[key];
    const id = `${group}:${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      key,
      label: label ?? def?.[0] ?? humanize(key),
      value: formatted,
      group: def?.[1] ?? group,
      sensitive: sensitive ?? def?.[2] ?? false,
    });
  };

  for (const [block, data] of Object.entries(raw)) {
    if (!data || typeof data !== 'object' || data instanceof Uint8Array) continue;
    if (block in BLOCK_GROUP) {
      for (const [k, v] of Object.entries(data)) {
        if (block === 'iptc') push(k, v, 'iptc', `IPTC ${humanize(k)}`, IPTC_SENSITIVE.has(k));
        else if (block === 'icc') push(k, v, 'icc', `ICC ${humanize(k)}`);
        else if (block === 'gps' && (k === 'GPSLatitude' || k === 'GPSLongitude')) continue;
        else push(k, v, BLOCK_GROUP[block]);
      }
    } else {
      // XMP namespace (dc, xmp, photoshop, xmpMM, aux, crs, Iptc4xmpCore, …)
      for (const [k, v] of Object.entries(data)) {
        const sensitive = /creator|rights|city|country|state|location|serial|owner|author|description|title|subject|History|DocumentID|InstanceID/i.test(k);
        push(`${block}:${k}`, v, 'xmp', `XMP ${block}:${k}`, sensitive);
      }
    }
  }
  return out;
}

export const GROUP_LABELS: Record<GroupId, string> = {
  file: 'File',
  image: 'Image',
  camera: 'Camera & lens',
  settings: 'Exposure settings',
  datetime: 'Date & time',
  location: 'Location (GPS)',
  author: 'Author & description',
  software: 'Software',
  iptc: 'IPTC',
  xmp: 'XMP',
  icc: 'Color profile (ICC)',
  other: 'Other',
};
