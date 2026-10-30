import type { PhotoRecord } from './types';
import { aspectRatio, formatBytes, formatDate, formatExposure, megapixels } from './format';

export interface Summary {
  camera?: string;
  make?: string;
  model?: string;
  lens?: string;
  taken?: Date;
  takenText?: string;
  iso?: number;
  aperture?: string;
  shutter?: string;
  focal?: string;
  focal35?: number;
  exposureComp?: string;
  flash?: string;
  dimensions?: string;
  megapixels?: string;
  aspect?: string;
  size: string;
  software?: string;
}

export function summarize(r: PhotoRecord): Summary {
  const i0 = r.raw.ifd0 ?? {};
  const ex = r.raw.exif ?? {};
  const make = typeof i0.Make === 'string' ? i0.Make.trim() : undefined;
  const model = typeof i0.Model === 'string' ? i0.Model.trim() : undefined;
  // Avoid "Canon Canon EOS R6"
  const camera = model ? (make && !model.toLowerCase().startsWith(make.toLowerCase().split(' ')[0]) ? `${make} ${model}` : model) : make;
  const taken: Date | undefined = ex.DateTimeOriginal instanceof Date ? ex.DateTimeOriginal : ex.CreateDate instanceof Date ? ex.CreateDate : i0.ModifyDate instanceof Date ? i0.ModifyDate : undefined;
  const { width: w, height: h } = r.tech;
  return {
    camera,
    make,
    model,
    lens: typeof ex.LensModel === 'string' ? ex.LensModel.trim() : undefined,
    taken,
    takenText: taken ? formatDate(taken) : undefined,
    iso: typeof ex.ISO === 'number' ? ex.ISO : Array.isArray(ex.ISO) ? ex.ISO[0] : undefined,
    aperture: typeof ex.FNumber === 'number' ? `f/${+ex.FNumber.toFixed(1)}` : undefined,
    shutter: typeof ex.ExposureTime === 'number' ? formatExposure(ex.ExposureTime) : undefined,
    focal: typeof ex.FocalLength === 'number' ? `${+ex.FocalLength.toFixed(1)} mm` : undefined,
    focal35: typeof ex.FocalLengthIn35mmFormat === 'number' ? ex.FocalLengthIn35mmFormat : undefined,
    exposureComp: typeof ex.ExposureCompensation === 'number' && ex.ExposureCompensation !== 0 ? `${ex.ExposureCompensation > 0 ? '+' : ''}${+ex.ExposureCompensation.toFixed(2)} EV` : undefined,
    flash: typeof ex.Flash === 'string' ? ex.Flash : undefined,
    dimensions: w && h ? `${w} × ${h}` : undefined,
    megapixels: w && h ? megapixels(w, h) : undefined,
    aspect: w && h ? aspectRatio(w, h) : undefined,
    size: formatBytes(r.size),
    software: typeof i0.Software === 'string' ? i0.Software : undefined,
  };
}

/** One-line description, e.g. "24.2 MP JPEG from Canon EOS R6". */
export function describe(r: PhotoRecord): string {
  const s = summarize(r);
  const fmt = r.format === 'unknown' ? (r.ext || 'image').toUpperCase() : r.format.toUpperCase();
  return [s.megapixels, fmt, s.camera ? `from ${s.camera}` : ''].filter(Boolean).join(' ');
}
