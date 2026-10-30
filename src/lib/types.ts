export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic' | 'avif' | 'tiff' | 'gif' | 'unknown';

/** Which metadata containers were found in the file (the "format detector"). */
export interface SegmentMap {
  exif: boolean;
  gps: boolean;
  iptc: boolean;
  xmp: boolean;
  icc: boolean;
  thumbnail: boolean;
  makerNote: boolean;
  comment: boolean;
  c2pa: boolean;
  mpf: boolean;
  textChunks: boolean;
}

export interface TechInfo {
  width?: number;
  height?: number;
  bitDepth?: number;
  components?: number;
  colorModel?: string;
  progressive?: boolean;
  subsampling?: string;
  quality?: number;
  hasAlpha?: boolean;
  dpiX?: number;
  dpiY?: number;
  iccName?: string;
  lossless?: boolean;
  animated?: boolean;
}

export interface GpsInfo {
  lat: number;
  lon: number;
  alt?: number;
  direction?: number;
  timestamp?: string;
}

export interface Field {
  key: string; // raw tag name
  label: string; // human-friendly label
  value: string; // formatted value
  group: GroupId;
  sensitive?: boolean;
}

export type GroupId = 'file' | 'image' | 'camera' | 'settings' | 'datetime' | 'location' | 'author' | 'software' | 'iptc' | 'xmp' | 'icc' | 'other';

export type Severity = 'high' | 'medium' | 'low';

export type CleanCategory =
  | 'gps'
  | 'device'
  | 'serial'
  | 'datetime'
  | 'software'
  | 'author'
  | 'description'
  | 'thumbnail'
  | 'settings'
  | 'xmp'
  | 'iptc'
  | 'c2pa';

export interface Finding {
  id: string;
  label: string;
  severity: Severity;
  found: boolean;
  detail?: string;
  explain: string;
  category: CleanCategory;
  weight: number;
}

export interface PrivacyReport {
  score: number;
  level: 'low' | 'medium' | 'high';
  headline: string;
  findings: Finding[];
}

export interface PhotoRecord {
  id: string;
  file: File;
  name: string;
  size: number;
  mime: string;
  ext: string;
  format: ImageFormat;
  previewUrl?: string;
  thumbUrl?: string;
  tech: TechInfo;
  segments: SegmentMap;
  raw: Record<string, any>;
  gps?: GpsInfo;
  fields: Field[];
  privacy: PrivacyReport;
  hash?: string;
  error?: string;
}

export interface CleanOptions {
  remove: Set<CleanCategory>;
  keepIcc: boolean;
  keepOrientation: boolean;
}
