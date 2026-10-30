// Tool registry: one entry per landing page. Content is written for people
// first. Each page explains the tool, the data and the common questions.
export type ToolMode = 'viewer' | 'privacy' | 'location' | 'clean' | 'clean-gps' | 'batch' | 'csv';
export type Cluster = 'inspect' | 'clean' | 'analyze';

export interface Tool {
  slug: string;
  mode: ToolMode;
  cluster: Cluster;
  icon: string;
  name: string;
  card: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  dzTitle: string;
  dzText: string;
  steps: [string, string][];
  sections: { h2: string; html: string }[];
  faq: [string, string][];
  related: string[];
}

const LOCAL_FAQ: [string, string] = [
  'Are my photos uploaded to a server?',
  'No. The tool runs entirely in your browser using JavaScript. Your photos are read from your device’s memory and never sent anywhere. After the page has loaded once, you can even turn off your internet connection and it keeps working.',
];

export const TOOLS: Tool[] = [
  {
    slug: 'exif-viewer',
    mode: 'viewer',
    cluster: 'inspect',
    icon: 'search',
    name: 'EXIF Viewer',
    card: 'See every hidden detail in a photo: camera, settings, date and GPS.',
    title: 'EXIF Viewer: See Photo Metadata Online (Private, No Upload)',
    description: 'Free online EXIF viewer. See camera, lens, settings, date, GPS location, IPTC and XMP metadata of JPG, PNG, HEIC and WebP photos. Runs in your browser, nothing is uploaded.',
    h1: 'EXIF Viewer: see what’s hidden in your photos',
    lead: 'Drop a photo to read its camera, lens, exposure settings, date, GPS location and every other metadata tag, all inside your browser.',
    dzTitle: 'Drop a photo to view its EXIF data',
    dzText: 'or choose a file. JPG, HEIC, PNG, WebP, TIFF, AVIF',
    steps: [
      ['Add a photo', 'Drag it onto the page, choose a file, or paste it. Works with photos straight from iPhone, Android and cameras.'],
      ['Read the summary', 'See the camera, lens, settings and date at a glance, with a clear warning if GPS location is present.'],
      ['Dig deeper or export', 'Browse every tag grouped by type, search it, and export to JSON, CSV or a printable report.'],
    ],
    sections: [
      {
        h2: 'What is EXIF data?',
        html: `<p>EXIF (Exchangeable Image File Format) is information your camera or phone writes into every photo it takes. It sits invisibly inside the file next to the image itself. A typical photo carries <strong>dozens of tags</strong>, including:</p>
<ul><li><strong>Device</strong>: camera or phone make and model, lens, sometimes the serial number</li><li><strong>Settings</strong>: shutter speed, aperture, ISO, focal length, flash, white balance</li><li><strong>Time</strong>: the exact date and time the photo was taken, often with time zone</li><li><strong>Location</strong>: GPS latitude, longitude, altitude and which way the camera was facing</li><li><strong>Software</strong>: the app or editor and OS version used</li></ul>
<p>Besides EXIF, photos can contain <strong>IPTC</strong> (captions, credits, keywords used by photo agencies), <strong>XMP</strong> (Adobe and editor data, including edit history) and an <strong>ICC color profile</strong>. This viewer reads all of them and shows them in plain language.</p>`,
      },
      {
        h2: 'Why check a photo’s metadata?',
        html: `<ul><li><strong>Privacy</strong>: see whether a photo reveals where you live before you post or send it.</li><li><strong>Photography</strong>: learn which settings produced a great shot, or check your lens and focal length habits.</li><li><strong>Verification</strong>: check when and with what device a photo was taken, and whether it was edited (journalists and researchers).</li><li><strong>Selling online</strong>: make sure product photos on marketplaces don’t leak your home location.</li></ul>
<div class="callout"><p><strong>Note:</strong> metadata can be edited or removed, so it is evidence, not proof. A photo with no EXIF isn’t necessarily fake, and a photo with EXIF isn’t necessarily original.</p></div>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['Can I view EXIF data of iPhone HEIC photos?', 'Yes. HEIC metadata (camera, settings, date and GPS) is read in every modern browser. The image preview itself appears only in browsers that can display HEIC, such as Safari.'],
      ['Why does my photo show no EXIF data?', 'Many apps remove metadata when you share or download. Social networks, messaging apps, screenshots and “Save image as…” from websites usually produce files with little or no EXIF. Try the original file from your camera roll instead.'],
      ['Can I see where a photo was taken?', 'Only if it contains GPS coordinates. If it does, the viewer shows the location with links to OpenStreetMap, Google Maps and Apple Maps. You can also open the dedicated Photo Location Finder.'],
      ['Can I edit EXIF data here?', 'You can remove metadata with the Remove EXIF tool. Editing individual values (dates, copyright, captions) is planned.'],
    ],
    related: ['photo-privacy-checker', 'remove-exif', 'photo-location-finder', 'batch-exif-viewer'],
  },
  {
    slug: 'remove-exif',
    mode: 'clean',
    cluster: 'clean',
    icon: 'sparkles',
    name: 'Remove EXIF Data',
    card: 'Strip metadata from photos without losing quality. One photo or a hundred.',
    title: 'Remove EXIF Data From Photos Online: Free, No Upload',
    description: 'Remove EXIF, GPS location and all metadata from JPG, PNG and WebP photos without losing quality. Choose exactly what to keep. 100% in your browser.',
    h1: 'Remove EXIF data from photos without losing quality',
    lead: 'Strip GPS location, camera details, dates and hidden thumbnails in one click. JPG, PNG and WebP are cleaned losslessly, right on your device.',
    dzTitle: 'Drop photos to remove their metadata',
    dzText: 'or choose files. One photo or a batch of up to 100',
    steps: [
      ['Add photos', 'Drop one photo or a whole batch. We show exactly what metadata each one contains.'],
      ['Choose what to remove', 'Remove everything, only private data, only location, or pick individual categories.'],
      ['Download & verify', 'Get the clean copy (or a ZIP). We re-read the cleaned file to confirm the data is really gone.'],
    ],
    sections: [
      {
        h2: 'Lossless: your image quality stays exactly the same',
        html: `<p>Many “metadata removers” work by re-saving the photo, which recompresses it and lowers quality every time. This tool works differently: for <strong>JPG, PNG and WebP</strong> it rebuilds the file around the original image data, copying the pixels byte-for-byte and leaving out only the metadata blocks. There’s no recompression and no quality loss, and the file usually gets a little smaller.</p>
<p>HEIC, TIFF and AVIF can’t be edited this way in a browser, so they are converted to a high-quality JPEG with all metadata removed.</p>`,
      },
      {
        h2: 'What gets removed',
        html: `<table><thead><tr><th>Category</th><th>Examples</th><th>Risk</th></tr></thead><tbody>
<tr><td>GPS location</td><td>Latitude, longitude, altitude, direction, place names</td><td>High</td></tr>
<tr><td>Serial numbers & IDs</td><td>Camera body/lens serial, image unique ID, maker notes</td><td>High</td></tr>
<tr><td>Author & owner</td><td>Artist, camera owner name, copyright</td><td>Medium</td></tr>
<tr><td>Date & time</td><td>Date taken, digitised, modified, time zone</td><td>Medium</td></tr>
<tr><td>Embedded thumbnail</td><td>Small preview that may show the uncropped original</td><td>Medium</td></tr>
<tr><td>Descriptions</td><td>Captions, comments, keywords</td><td>Low–Medium</td></tr>
<tr><td>Device & software</td><td>Phone/camera model, editing app, OS version</td><td>Low</td></tr>
<tr><td>XMP / IPTC / C2PA</td><td>Edit history, agency data, Content Credentials</td><td>Varies</td></tr>
</tbody></table>
<p>By default we <strong>keep the color profile</strong> (so colors don’t shift) and the <strong>orientation</strong> flag (so photos don’t appear sideways). Neither contains personal information. You can turn both off.</p>`,
      },
      {
        h2: 'Hidden data most tools miss',
        html: `<ul><li><strong>Embedded thumbnails</strong>: a small preview inside the EXIF block. Some editors don’t update it, so a cropped or blurred photo can still contain the original.</li><li><strong>Secondary images</strong>: modern phones may append extra images (HDR gain maps, depth maps) that carry their own metadata. They are removed too.</li><li><strong>Duplicated data in XMP</strong>: editors often copy dates, GPS and names into the XMP block. If you remove a category, we also remove the XMP block when it repeats that data.</li></ul>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['Does removing EXIF reduce image quality?', 'Not for JPG, PNG or WebP. They are cleaned losslessly, so the image data is not re-encoded. Other formats (HEIC, TIFF, AVIF) are converted to a high-quality JPEG.'],
      ['Can I keep camera settings but remove location?', 'Yes. Choose “Remove location only” to delete GPS and place names but keep everything else, or “Custom” to pick exactly which categories to remove.'],
      ['Can I clean many photos at once?', 'Yes. Drop up to 100 photos, choose a cleaning mode and click “Clean all” to download a ZIP of cleaned copies.'],
      ['How do I know the metadata is really gone?', 'After cleaning, the tool reads the new file again and shows a before/after comparison, including whether any GPS data remains. You can also open the cleaned file in the EXIF viewer.'],
      ['Will the original photo on my device change?', 'No. The original is never modified. You download a new, cleaned copy.'],
    ],
    related: ['remove-gps-from-photo', 'photo-privacy-checker', 'batch-exif-viewer', 'exif-viewer'],
  },
  {
    slug: 'photo-privacy-checker',
    mode: 'privacy',
    cluster: 'inspect',
    icon: 'shield',
    name: 'Photo Privacy Checker',
    card: 'Is your photo safe to share? Get a privacy score in plain language.',
    title: 'Photo Privacy Checker: Is My Photo Safe to Share?',
    description: 'Check what your photo reveals before you post it. Get a privacy score showing GPS location, serial numbers, names, dates and hidden thumbnails. No upload.',
    h1: 'Is your photo safe to share?',
    lead: 'Get a plain-language privacy report: we check for location, serial numbers, names, timestamps and hidden previews, then fix them in one click.',
    dzTitle: 'Drop a photo to check its privacy',
    dzText: 'or choose a file. Your photo stays on this device',
    steps: [
      ['Add a photo', 'The photo you’re about to post, send or sell.'],
      ['Get your privacy score', 'See what was found, why it matters and how risky it is, without technical jargon.'],
      ['Fix it in one click', 'Remove only the risky data or everything, and download a safe copy.'],
    ],
    sections: [
      {
        h2: 'What the privacy score checks',
        html: `<p>The score starts at 100 and drops for each piece of identifying metadata found. The biggest risks weigh the most:</p>
<ul><li><strong>GPS location</strong> (high): exact coordinates of where the photo was taken.</li><li><strong>Place names</strong> (high): city, country or address written into IPTC/XMP.</li><li><strong>Serial numbers & unique IDs</strong> (high): link all photos from the same camera together.</li><li><strong>Owner or author name</strong> (medium)</li><li><strong>Exact date & time</strong> (medium): can reveal routines.</li><li><strong>Hidden thumbnail</strong> (medium): may show the original before cropping.</li><li><strong>Content Credentials</strong> (medium): signed provenance that may include identity.</li><li><strong>Device, software, captions, edit history</strong> (low)</li></ul>
<div class="callout"><p>The score covers <em>metadata</em> only. What is visible in the photo itself (faces, house numbers, car plates, screens, reflections) can also give away personal information, so take a second look before posting.</p></div>`,
      },
      {
        h2: 'Do social networks remove metadata?',
        html: `<p>Most large social networks remove EXIF data, including GPS, from the copy of the photo that other people see. But keep in mind:</p>
<ul><li>The platform itself still receives your original file, with all its metadata.</li><li>Messaging apps differ. Many strip metadata from normal photo messages, but sending a photo as a <strong>file or document</strong> usually keeps the original metadata intact.</li><li>Email, cloud-storage links, AirDrop, forums, marketplaces and your own website usually keep the original metadata.</li></ul>
<p>The safest habit: <strong>clean the photo yourself before it leaves your device.</strong></p>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['What is a good privacy score?', '80–100 is low risk: only technical data such as camera model. 50–79 means some personal details are present. Below 50 usually means GPS location or identifying serial numbers are embedded.'],
      ['Can a photo reveal my home address?', 'Yes, if it contains GPS coordinates. Photos taken at home with location services enabled point to your house within a few metres. The checker shows this clearly and can remove it.'],
      ['How do I stop my phone adding location to photos?', 'On iPhone: Settings → Privacy & Security → Location Services → Camera → Never. Or, when sharing, tap Options and turn off Location. On Android: open the Camera app settings and turn off “Location tags” / “Save location”.'],
      ['Does this detect faces or text in the photo?', 'No. It analyses metadata only, not the image content.'],
    ],
    related: ['remove-exif', 'remove-gps-from-photo', 'photo-location-finder', 'exif-viewer'],
  },
  {
    slug: 'photo-location-finder',
    mode: 'location',
    cluster: 'inspect',
    icon: 'pin',
    name: 'Photo Location Finder',
    card: 'Find where a photo was taken from its GPS metadata, shown on a map.',
    title: 'Photo Location Finder: See Where a Photo Was Taken (GPS)',
    description: 'Find where a photo was taken. Read GPS coordinates from photo EXIF data and view them on a map, in decimal and DMS. Private: photos are never uploaded.',
    h1: 'Find where a photo was taken',
    lead: 'Read the GPS coordinates hidden in a photo and see them on a map, with altitude, camera direction and GPS time.',
    dzTitle: 'Drop a photo to find its location',
    dzText: 'or choose files. Drop several to see them all on one map',
    steps: [
      ['Add a photo', 'Original photos from phones and GPS-enabled cameras work best.'],
      ['See the coordinates', 'Decimal and degrees/minutes/seconds, altitude, direction and GPS time.'],
      ['Open the map', 'View it on an opt-in map or open it in OpenStreetMap, Google Maps or Apple Maps.'],
    ],
    sections: [
      {
        h2: 'How photo GPS location works',
        html: `<p>When location services are enabled, your phone or camera writes GPS coordinates into the photo’s EXIF data at the moment you press the shutter. Phones are typically accurate to a few metres outdoors. Some devices also record altitude, speed and the compass direction the camera was facing.</p>
<p>Coordinates are stored as degrees, minutes and seconds plus a hemisphere reference (N/S, E/W). This tool converts them to the decimal format used by map apps, e.g. <code>48.858370, 2.294481</code>.</p>`,
      },
      {
        h2: 'Why no location shows for some photos',
        html: `<ul><li>Location was turned off for the camera app.</li><li>The photo was shared through a service that strips metadata (most social networks and many messaging apps).</li><li>It is a screenshot, a scan, or an image saved from a website.</li><li>The photo was cleaned with a metadata remover.</li></ul>
<p>Without GPS metadata, a photo’s location can’t be read from the file. Any remaining clues are in the image content itself.</p>`,
      },
      {
        h2: 'Privacy of the map',
        html: `<p>The map is <strong>opt-in</strong>. Until you click “Show map”, nothing is requested from any map server. When you do, map tiles for that area are downloaded from OpenStreetMap, which tells their servers roughly which area you’re viewing. Your photo and its other metadata are never sent.</p>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['Can I find the location of any photo?', 'Only photos that still contain GPS metadata. Photos downloaded from social media almost never do, because the platforms remove it.'],
      ['How accurate is photo GPS?', 'Usually within 5–20 metres outdoors on modern phones; less accurate indoors or in dense cities. Some files include a “position accuracy” value, which is shown under All data.'],
      ['Can I see the locations of many photos at once?', 'Yes. Drop several photos and use “Show all photo locations on one map” in the batch view.'],
      ['How do I remove the location?', 'Click “Remove location” to download a copy without GPS and place names, or use the Remove GPS tool.'],
    ],
    related: ['remove-gps-from-photo', 'photo-privacy-checker', 'exif-viewer', 'batch-exif-viewer'],
  },
  {
    slug: 'remove-gps-from-photo',
    mode: 'clean-gps',
    cluster: 'clean',
    icon: 'pinOff',
    name: 'Remove Location from Photo',
    card: 'Delete GPS coordinates and place names but keep everything else.',
    title: 'Remove GPS Location From Photo Online: Free & Private',
    description: 'Remove GPS location and place names from photos while keeping camera settings and quality. Works with iPhone and Android photos. Nothing is uploaded.',
    h1: 'Remove location from photos',
    lead: 'Delete GPS coordinates and written place names from your photos, while keeping the date, camera settings and full image quality.',
    dzTitle: 'Drop photos to remove their location',
    dzText: 'or choose files. Batch of up to 100 supported',
    steps: [
      ['Add photos', 'We highlight which ones contain a location.'],
      ['Remove location', '“Remove location only” is pre-selected. Switch to “Remove everything” for maximum privacy.'],
      ['Download', 'Get the cleaned photo or a ZIP. Verified: no GPS remains.'],
    ],
    sections: [
      {
        h2: 'Why remove location from photos?',
        html: `<p>A photo taken at home with location services on contains coordinates that point to your house within a few metres. If you share the original file (by email, on a marketplace, a forum or a blog), anyone can read them with a free tool like this one.</p>
<p>Removing only the location is ideal when you want to keep useful information such as the date and camera settings (for example, for photographers sharing their work) but not reveal where the photo was taken.</p>`,
      },
      {
        h2: 'Stop your phone from adding location',
        html: `<h3>iPhone</h3><ul><li><strong>Per share</strong>: in the Share sheet, tap <strong>Options</strong> at the top and turn off <strong>Location</strong>.</li><li><strong>Permanently</strong>: Settings → Privacy &amp; Security → Location Services → Camera → <strong>Never</strong>.</li></ul>
<h3>Android</h3><ul><li>Open the <strong>Camera</strong> app → Settings → turn off <strong>Location tags</strong> / <strong>Save location</strong> (the name varies by manufacturer).</li><li>In Google Photos, you can remove the location from a photo’s details (but this does not always change files already shared).</li></ul>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['Will the date and camera information be kept?', 'Yes. “Remove location only” deletes GPS coordinates and place names (IPTC/XMP city and country) and keeps everything else. If an XMP block duplicates the location, that block is removed as well.'],
      ['Does this work with iPhone photos?', 'Yes. JPG photos are cleaned losslessly. HEIC photos are converted to a high-quality JPEG without location (HEIC preview needs Safari).'],
      ['Is the image quality reduced?', 'No, for JPG, PNG and WebP. Only the metadata blocks change; the image data is copied byte-for-byte.'],
    ],
    related: ['remove-exif', 'photo-location-finder', 'photo-privacy-checker', 'batch-exif-viewer'],
  },
  {
    slug: 'batch-exif-viewer',
    mode: 'batch',
    cluster: 'analyze',
    icon: 'images',
    name: 'Batch EXIF Viewer',
    card: 'Analyse up to 100 photos at once: table, statistics, map and ZIP cleaning.',
    title: 'Batch EXIF Viewer: Analyse Metadata of Many Photos at Once',
    description: 'View EXIF data of up to 100 photos at once. Sortable table, camera and lens statistics, GPS map, duplicate detection, CSV/JSON export and bulk metadata removal.',
    h1: 'Batch EXIF viewer for many photos',
    lead: 'Drop up to 100 photos to compare camera, lens, settings, dates and GPS in one sortable table, with gear statistics and bulk cleaning.',
    dzTitle: 'Drop up to 100 photos',
    dzText: 'or choose files. Everything is processed locally',
    steps: [
      ['Add a batch', 'Select a folder’s worth of photos from your camera, phone or SD card.'],
      ['Compare & sort', 'Sort by date, camera, ISO, GPS or privacy score. Click any photo for full details.'],
      ['Export or clean', 'Download a CSV/JSON of all metadata, or clean every photo into a ZIP.'],
    ],
    sections: [
      {
        h2: 'Built for photographers',
        html: `<ul><li><strong>Gear statistics</strong>: your most used camera, lens, focal length, aperture and ISO across a shoot.</li><li><strong>Find GPS leaks</strong>: see instantly which photos in a batch contain location data.</li><li><strong>Exact duplicates</strong>: detected by comparing file hashes.</li><li><strong>Bulk cleaning</strong>: remove everything, private data only, or location only, and download a ZIP.</li></ul>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['How many photos can I analyse?', 'Up to 100 per batch. Everything is processed in your browser, so very large RAW files or very old devices may be slower.'],
      ['Does it support RAW files?', 'DNG files are partially supported (metadata only). Support for other RAW formats (CR3, NEF, ARW) is planned.'],
      ['Can I export the table?', 'Yes, to CSV (opens in Excel, Numbers and Google Sheets) or JSON.'],
    ],
    related: ['exif-to-csv', 'remove-exif', 'photo-location-finder', 'exif-viewer'],
  },
  {
    slug: 'exif-to-csv',
    mode: 'csv',
    cluster: 'analyze',
    icon: 'table',
    name: 'EXIF to CSV',
    card: 'Export photo metadata from many photos into one spreadsheet.',
    title: 'EXIF to CSV: Export Photo Metadata to Excel or Sheets',
    description: 'Extract EXIF metadata from many photos into a CSV spreadsheet: filename, date, camera, lens, ISO, aperture, shutter, focal length, GPS and more. Free, no upload.',
    h1: 'Export photo EXIF data to CSV',
    lead: 'Turn the metadata of up to 100 photos into one clean spreadsheet for Excel, Numbers or Google Sheets.',
    dzTitle: 'Drop photos to export their metadata',
    dzText: 'or choose files. Up to 100 per batch',
    steps: [
      ['Add photos', 'Any mix of JPG, HEIC, PNG, WebP and TIFF.'],
      ['Check the preview', 'Review the table, sorted the way you like.'],
      ['Download CSV', 'UTF-8 with headers, ready for Excel and Google Sheets. JSON is also available.'],
    ],
    sections: [
      {
        h2: 'Columns included',
        html: `<p>Filename · Format · File size · Width · Height · Camera make · Camera model · Lens · Date taken (ISO 8601) · ISO · Aperture · Shutter speed · Focal length · Focal length (35 mm) · GPS latitude · GPS longitude · GPS altitude · Software · Privacy score · SHA-256 hash</p>
<p>Need every tag? Use <strong>Export JSON</strong>, which includes the full EXIF, GPS, IPTC, XMP and ICC data for each photo.</p>
<div class="callout"><p>Values that start with <code>=</code>, <code>+</code>, <code>-</code> or <code>@</code> are escaped so metadata text can’t run as a spreadsheet formula.</p></div>`,
      },
    ],
    faq: [
      LOCAL_FAQ,
      ['Will the CSV open correctly in Excel?', 'Yes. The file is UTF-8 with a byte-order mark, so Excel shows accented characters correctly.'],
      ['Can I get all tags, not just the main ones?', 'Yes. Use Export JSON for the complete metadata of every photo.'],
    ],
    related: ['batch-exif-viewer', 'exif-viewer', 'remove-exif', 'photo-privacy-checker'],
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug)!;

export const CLUSTERS: { id: Cluster; title: string; icon: string; text: string }[] = [
  { id: 'inspect', title: 'Inspect', icon: 'search', text: 'See everything a photo reveals: camera, settings, date and location.' },
  { id: 'clean', title: 'Clean', icon: 'shieldCheck', text: 'Remove location and personal data without losing quality.' },
  { id: 'analyze', title: 'Analyze', icon: 'table', text: 'Compare many photos, get statistics and export to CSV/JSON.' },
];
