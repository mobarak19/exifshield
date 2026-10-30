// Plain-language privacy assessment of a photo's metadata.
import type { Finding, GpsInfo, PrivacyReport, SegmentMap } from './types';
import { formatValue } from './fields';
import { formatDate } from './format';

type Raw = Record<string, any>;

const pick = (raw: Raw, keys: string[], blocks = ['ifd0', 'exif', 'gps', 'iptc']): [string, any][] => {
  const hits: [string, any][] = [];
  for (const b of blocks) {
    const data = raw[b];
    if (!data) continue;
    for (const k of keys) {
      const v = data[k];
      if (v !== undefined && v !== null && String(v).replace(/\0/g, '').trim() !== '') hits.push([k, v]);
    }
  }
  return hits;
};

const pickXmp = (raw: Raw, re: RegExp): [string, any][] => {
  const hits: [string, any][] = [];
  for (const [ns, data] of Object.entries(raw)) {
    if (['ifd0', 'exif', 'gps', 'interop', 'iptc', 'icc', 'jfif', 'ihdr', 'ifd1'].includes(ns)) continue;
    if (!data || typeof data !== 'object') continue;
    for (const [k, v] of Object.entries(data)) if (re.test(`${ns}:${k}`) && v) hits.push([`${ns}:${k}`, v]);
  }
  return hits;
};

const show = (hits: [string, any][], max = 2) =>
  hits.slice(0, max).map(([k, v]) => formatValue(k, v)).filter(Boolean).join(' · ');

export const LOCATION_TEXT_IPTC = ['City', 'Sublocation', 'State', 'ProvinceState', 'Country', 'CountryPrimaryLocationName', 'CountryCode'];
export const LOCATION_TEXT_XMP = /photoshop:(City|State|Country)|Iptc4xmpCore:(Location|CountryCode)|Iptc4xmpExt:Location|exif:GPS/i;

export function assessPrivacy(raw: Raw, seg: SegmentMap, gps?: GpsInfo): PrivacyReport {
  const f: Finding[] = [];

  f.push({
    id: 'gps', category: 'gps', severity: 'high', weight: 40, label: 'GPS location', found: !!gps,
    detail: gps ? `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}` : undefined,
    explain: gps
      ? 'The exact coordinates where this photo was taken are embedded. Anyone with the original file can see the location on a map, which could be your home, school or workplace.'
      : 'No GPS coordinates were found.',
  });

  const placeHits = [...pick(raw, LOCATION_TEXT_IPTC, ['iptc']), ...pickXmp(raw, /photoshop:(City|State|Country)|Iptc4xmpCore:Location/i)];
  f.push({
    id: 'place', category: 'gps', severity: 'high', weight: 15, label: 'Place names', found: placeHits.length > 0,
    detail: show(placeHits, 3) || undefined,
    explain: placeHits.length
      ? 'City, country or location names are written into the file (IPTC/XMP). They reveal the location even without GPS.'
      : 'No written place names (city, country) were found.',
  });

  const serialHits = [
    ...pick(raw, ['BodySerialNumber', 'SerialNumber', 'LensSerialNumber', 'InternalSerialNumber', 'ImageUniqueID']),
    ...pickXmp(raw, /SerialNumber|ImageUniqueID/i),
  ];
  f.push({
    id: 'serial', category: 'serial', severity: 'high', weight: 15, label: 'Device serial number / unique ID', found: serialHits.length > 0,
    detail: show(serialHits) || undefined,
    explain: serialHits.length
      ? 'A serial number or unique ID can link this photo to every other photo taken with the same camera, including ones you posted under a different name.'
      : seg.makerNote
        ? 'No standard serial number found, but manufacturer “maker notes” are present and may contain one.'
        : 'No serial numbers or unique IDs were found.',
  });

  const authorHits = [
    ...pick(raw, ['Artist', 'Copyright', 'OwnerName', 'CameraOwnerName', 'XPAuthor', 'Byline', 'CopyrightNotice', 'Contact', 'Writer']),
    ...pickXmp(raw, /dc:(creator|rights)|photoshop:(AuthorsPosition|Credit)|Iptc4xmpCore:CreatorContactInfo/i),
  ];
  f.push({
    id: 'author', category: 'author', severity: 'medium', weight: 10, label: 'Name of owner / author', found: authorHits.length > 0,
    detail: show(authorHits) || undefined,
    explain: authorHits.length
      ? 'A personal name is stored in the file. That is useful for copyright, but it identifies you when the photo is shared anonymously.'
      : 'No author, owner or copyright name was found.',
  });

  const dateHits = pick(raw, ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSDateStamp'], ['ifd0', 'exif', 'gps']);
  const taken = raw.exif?.DateTimeOriginal ?? raw.exif?.CreateDate ?? raw.ifd0?.ModifyDate;
  f.push({
    id: 'datetime', category: 'datetime', severity: 'medium', weight: 8, label: 'Exact date & time', found: dateHits.length > 0,
    detail: taken ? formatDate(taken) : undefined,
    explain: dateHits.length
      ? 'The precise time the photo was taken is recorded. Combined with other photos it can reveal routines and when you were somewhere.'
      : 'No capture date or time was found.',
  });

  f.push({
    id: 'thumbnail', category: 'thumbnail', severity: 'medium', weight: 8, label: 'Hidden preview thumbnail', found: seg.thumbnail,
    explain: seg.thumbnail
      ? 'A small preview image is embedded. Some editors don’t update it, so it can still show the original photo before it was cropped or blurred.'
      : 'No embedded preview thumbnail was found.',
  });

  const deviceHits = pick(raw, ['Make', 'Model', 'LensModel'], ['ifd0', 'exif']);
  f.push({
    id: 'device', category: 'device', severity: 'low', weight: 5, label: 'Camera / phone model', found: deviceHits.length > 0,
    detail: show(deviceHits, 2) || undefined,
    explain: deviceHits.length
      ? 'The device make and model are recorded. Low risk on its own, but it narrows down who could have taken the photo.'
      : 'No camera or phone model was found.',
  });

  const swHits = [...pick(raw, ['Software', 'HostComputer', 'ProcessingSoftware'], ['ifd0']), ...pickXmp(raw, /xmp:CreatorTool/i)];
  f.push({
    id: 'software', category: 'software', severity: 'low', weight: 4, label: 'Editing software / OS version', found: swHits.length > 0,
    detail: show(swHits, 2) || undefined,
    explain: swHits.length
      ? 'The software (and sometimes OS version) used to create or edit the photo is recorded.'
      : 'No software information was found.',
  });

  const descHits = [
    ...pick(raw, ['ImageDescription', 'UserComment', 'XPComment', 'XPKeywords', 'XPSubject', 'XPTitle', 'Caption', 'Headline', 'Keywords', 'ObjectName']),
    ...pickXmp(raw, /dc:(description|title|subject)/i),
  ];
  f.push({
    id: 'description', category: 'description', severity: 'low', weight: 5, label: 'Descriptions, comments & keywords', found: descHits.length > 0 || seg.comment,
    detail: show(descHits, 2) || (seg.comment ? 'JPEG comment present' : undefined),
    explain: descHits.length || seg.comment
      ? 'Free-text captions, comments or keywords are embedded. They may contain names, places or other personal details.'
      : 'No descriptions, comments or keywords were found.',
  });

  const histHits = pickXmp(raw, /xmpMM:(History|DocumentID|OriginalDocumentID|DerivedFrom)/i);
  f.push({
    id: 'history', category: 'xmp', severity: 'low', weight: 4, label: 'Editing history (XMP)', found: histHits.length > 0,
    explain: histHits.length
      ? 'Adobe-style document IDs or edit history are stored. They can link this file to its original and to other exports.'
      : 'No editing history was found.',
  });

  f.push({
    id: 'c2pa', category: 'c2pa', severity: 'medium', weight: 6, label: 'Content Credentials (C2PA)', found: seg.c2pa,
    explain: seg.c2pa
      ? 'A signed Content Credentials manifest is embedded. It can record the creator identity, tools used (including AI) and edit history.'
      : 'No Content Credentials manifest was found.',
  });

  const lost = f.filter((x) => x.found).reduce((a, x) => a + x.weight, 0);
  const score = Math.max(0, 100 - lost);
  const level = score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high';
  const gpsFound = f[0].found || f[1].found;
  const headline = gpsFound
    ? 'This photo reveals where it was taken.'
    : f.some((x) => x.found && x.severity === 'high')
      ? 'This photo contains details that can identify your device.'
      : f.some((x) => x.found && x.severity === 'medium')
        ? 'Some personal details are embedded in this photo.'
        : f.some((x) => x.found)
          ? 'Only low-risk technical details found.'
          : 'No personal metadata found. This photo looks safe to share.';

  return { score, level, headline, findings: f };
}
