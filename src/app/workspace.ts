// Client controller for the tool workspace: file intake, state, events.
import { analyzeFile, releaseRecord } from '../lib/analyze';
import { ALL_CATEGORIES, PRESETS, canCleanLossless, cleanPhoto } from '../lib/clean';
import { download, exportCsv, exportJson, exportTxt, recordToJson } from '../lib/export';
import type { CleanCategory, CleanOptions, PhotoRecord } from '../lib/types';
import { baseName, extOf } from '../lib/format';
import * as V from './views';
import { u } from '../lib/url';

type Mode = 'viewer' | 'privacy' | 'location' | 'clean' | 'clean-gps' | 'batch' | 'csv';

const MODE_TAB: Record<Mode, V.Tab> = {
  viewer: 'overview', privacy: 'privacy', location: 'location', clean: 'clean', 'clean-gps': 'clean', batch: 'overview', csv: 'overview',
};
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'webp', 'heic', 'heif', 'avif', 'tif', 'tiff', 'gif', 'dng']);
const SAMPLES = ['/samples/sample-camera.jpg', '/samples/sample-phone.jpg', '/samples/sample-clean.jpg'].map(u);

export function mountWorkspace(root: HTMLElement) {
  const mode = (root.dataset.mode as Mode) || 'viewer';
  const max = Number(root.dataset.max) || 100;
  const isBatchMode = mode === 'batch' || mode === 'csv';
  const empty = root.querySelector<HTMLElement>('[data-view="empty"]')!;
  const app = root.querySelector<HTMLElement>('[data-view="app"]')!;
  const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
  const toastEl = root.querySelector<HTMLElement>('.toast')!;
  const dropzone = root.querySelector<HTMLElement>('.dropzone')!;

  const defaultPreset: V.PresetId = mode === 'clean-gps' ? 'location' : mode === 'clean' ? 'all' : 'private';
  const state = {
    records: [] as PhotoRecord[],
    current: null as string | null,
    view: 'empty' as 'empty' | 'loading' | 'single' | 'batch',
    tab: MODE_TAB[mode],
    query: '',
    showRaw: false,
    sort: { key: 'name' as V.SortKey, dir: 1 as 1 | -1 },
    batchPreset: (mode === 'clean-gps' ? 'location' : 'all') as V.PresetId,
    batchBusy: '',
    mapShown: false,
    clean: new Map<string, V.CleanState>(),
  };

  // ---------------------------------------------------------------- utils
  let toastTimer = 0;
  const toast = (msg: string) => {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2600);
  };
  const currentRecord = () => state.records.find((r) => r.id === state.current);
  const cleanStateFor = (id: string): V.CleanState => {
    let cs = state.clean.get(id);
    if (!cs) {
      cs = { preset: defaultPreset, custom: new Set(PRESETS.private), keepIcc: true, keepOrientation: true, busy: false };
      state.clean.set(id, cs);
    }
    return cs;
  };
  const optionsFrom = (preset: V.PresetId, cs?: V.CleanState): CleanOptions => ({
    remove: new Set<CleanCategory>(preset === 'custom' ? cs?.custom ?? [] : PRESETS[preset] ?? ALL_CATEGORIES),
    keepIcc: cs?.keepIcc ?? true,
    keepOrientation: cs?.keepOrientation ?? true,
  });

  // ---------------------------------------------------------------- intake
  async function addFiles(list: FileList | File[], append = true) {
    const files = [...list].filter((f) => f.type.startsWith('image/') || IMAGE_EXT.has(extOf(f.name)));
    const skipped = list.length - files.length;
    if (!files.length) {
      toast(skipped ? 'Those files are not images.' : 'No files selected.');
      return;
    }
    if (!append) reset(false);
    const room = max - state.records.length;
    const take = files.slice(0, Math.max(0, room));
    if (files.length > take.length) toast(`Only ${max} photos at a time. ${files.length - take.length} skipped.`);
    else if (skipped) toast(`${skipped} non-image file${skipped > 1 ? 's' : ''} skipped.`);
    if (!take.length) return;

    const prevView = state.view;
    state.view = 'loading';
    showApp();
    const added: PhotoRecord[] = [];
    for (let i = 0; i < take.length; i++) {
      renderLoading(i, take.length, take[i].name);
      try {
        added.push(await analyzeFile(take[i]));
      } catch (e) {
        toast(`Couldn't read ${take[i].name}`);
        console.error(e);
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    state.records.push(...added);
    if (!state.records.length) {
      state.view = prevView === 'loading' ? 'empty' : prevView;
      return render();
    }
    if (isBatchMode || state.records.length > 1) {
      state.view = 'batch';
      state.current = null;
    } else {
      state.view = 'single';
      state.current = state.records[0].id;
    }
    state.mapShown = false;
    render();
    app.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadSamples() {
    const urls = isBatchMode ? SAMPLES : SAMPLES.slice(0, 1);
    try {
      const files = await Promise.all(
        urls.map(async (u) => {
          const res = await fetch(u);
          const blob = await res.blob();
          return new File([blob], u.split('/').pop()!, { type: 'image/jpeg', lastModified: Date.now() });
        }),
      );
      await addFiles(files, false);
    } catch {
      toast('Could not load the sample photo.');
    }
  }

  function reset(renderNow = true) {
    state.records.forEach(releaseRecord);
    state.clean.forEach((cs) => cs.result && releaseRecord(cs.result.after));
    state.records = [];
    state.clean.clear();
    state.current = null;
    state.query = '';
    state.view = 'empty';
    state.mapShown = false;
    if (renderNow) render();
  }

  // ---------------------------------------------------------------- render
  function showApp() {
    const showEmpty = state.view === 'empty';
    empty.hidden = !showEmpty;
    app.hidden = showEmpty;
  }

  function renderLoading(i: number, n: number, name: string) {
    app.innerHTML = `<div class="card card-pad"><div class="loading" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div><strong>Reading ${n > 1 ? `photo ${i + 1} of ${n}` : 'your photo'}…</strong><div class="small muted">${escapeText(name)}: processing on your device</div></div>
      ${n > 1 ? `<div class="progress"><i style="width:${Math.round(((i + 1) / n) * 100)}%"></i></div>` : ''}
    </div></div>`;
  }
  const escapeText = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

  function render() {
    showApp();
    if (state.view === 'empty') {
      app.innerHTML = '';
      return;
    }
    if (state.view === 'batch') {
      app.innerHTML = `<div class="card card-pad">${V.batch(state.records, state.sort, mode, state.batchPreset, state.batchBusy)}</div>`;
      return;
    }
    const r = currentRecord();
    if (!r) return;
    app.innerHTML = `<div class="card card-pad">${V.resultBar(r, state.records.length > 1 || isBatchMode)}
      <div class="single" data-tab="${state.tab}">${V.side(r)}<div class="main" style="min-width:0">${V.tabs(r, state.tab)}
        <div class="tabpanel" role="tabpanel" id="panel-${state.tab}" aria-labelledby="tab-${state.tab}" tabindex="0">${panel(r)}</div>
      </div></div></div>`;
    const img = app.querySelector<HTMLImageElement>('[data-preview]');
    img?.addEventListener('error', () => {
      img.remove();
      app.querySelector<HTMLElement>('.noprev')!.hidden = false;
    });
    if (state.mapShown && state.tab === 'location' && r.gps) void drawMap();
  }

  function panel(r: PhotoRecord) {
    switch (state.tab) {
      case 'overview': return V.overview(r);
      case 'privacy': return V.privacy(r);
      case 'location': return V.location(r, state.mapShown);
      case 'camera': return V.camera(r, state.showRaw);
      case 'all': return V.allFields(r, state.query, state.showRaw);
      case 'clean': return V.cleanPanel(r, cleanStateFor(r.id), canCleanLossless(r));
    }
  }

  async function drawMap() {
    const el = app.querySelector<HTMLElement>('[data-map]');
    if (!el) return;
    el.innerHTML = '<div class="spinner" aria-label="Loading map"></div>';
    const pts = (state.view === 'batch' ? state.records : [currentRecord()!])
      .filter((r) => r?.gps)
      .map((r) => ({ lat: r.gps!.lat, lon: r.gps!.lon, label: r.name }));
    try {
      const { showMap } = await import('./map');
      await showMap(el, pts);
    } catch {
      el.innerHTML = '<p class="muted">The map could not be loaded. You may be offline. Use the links below instead.</p>';
    }
  }

  // ---------------------------------------------------------------- actions
  async function runClean(r: PhotoRecord) {
    const cs = cleanStateFor(r.id);
    const opts = optionsFrom(cs.preset, cs);
    if (!opts.remove.size) {
      toast('Choose at least one thing to remove.');
      return;
    }
    cs.busy = true;
    cs.error = undefined;
    render();
    try {
      const res = await cleanPhoto(r, opts);
      download(res.blob, res.name);
      if (cs.result) releaseRecord(cs.result.after);
      const after = await analyzeFile(new File([res.blob], res.name, { type: res.blob.type }));
      cs.result = { res, after };
      toast('Clean copy downloaded');
    } catch (e) {
      cs.error = e instanceof Error ? e.message : String(e);
    } finally {
      cs.busy = false;
      render();
    }
  }

  async function cleanAll() {
    const opts = optionsFrom(state.batchPreset);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Set<string>();
    let failed = 0;
    for (let i = 0; i < state.records.length; i++) {
      state.batchBusy = `Cleaning ${i + 1}/${state.records.length}…`;
      render();
      try {
        const res = await cleanPhoto(state.records[i], opts);
        let name = res.name;
        for (let n = 2; used.has(name); n++) name = `${baseName(res.name)}-${n}.${extOf(res.name)}`;
        used.add(name);
        zip.file(name, res.blob);
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    state.batchBusy = 'Creating ZIP…';
    render();
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    download(blob, `cleaned-photos-${used.size}.zip`);
    state.batchBusy = '';
    render();
    toast(failed ? `${used.size} cleaned, ${failed} couldn't be processed` : `${used.size} photos cleaned`);
  }

  function setTab(tab: V.Tab, focus = false) {
    state.tab = tab;
    render();
    if (focus) app.querySelector<HTMLElement>(`#tab-${tab}`)?.focus();
  }

  // ---------------------------------------------------------------- events
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!t || !root.contains(t)) {
      app.querySelectorAll<HTMLElement>('.menu-list').forEach((m) => (m.hidden = true));
      return;
    }
    const r = currentRecord();
    const a = t.dataset.action;
    if (a !== 'menu') app.querySelectorAll<HTMLElement>('.menu-list').forEach((m) => (m.hidden = true));
    switch (a) {
      case 'browse':
        e.stopPropagation();
        input.click();
        break;
      case 'sample':
        e.stopPropagation();
        void loadSamples();
        break;
      case 'add':
        input.click();
        break;
      case 'new':
        reset();
        dropzone.focus();
        break;
      case 'back':
        state.view = 'batch';
        state.current = null;
        state.mapShown = false;
        render();
        break;
      case 'open':
        state.current = t.dataset.id!;
        state.view = 'single';
        state.tab = MODE_TAB[mode];
        state.mapShown = false;
        render();
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'tab':
        setTab(t.dataset.tab as V.Tab);
        break;
      case 'goto-clean':
        if (r) {
          cleanStateFor(r.id).preset = t.dataset.preset as V.PresetId;
          setTab('clean');
          app.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        break;
      case 'menu': {
        const list = t.nextElementSibling as HTMLElement;
        list.hidden = !list.hidden;
        t.setAttribute('aria-expanded', String(!list.hidden));
        if (!list.hidden) list.querySelector<HTMLElement>('button')?.focus();
        break;
      }
      case 'export-json':
        exportJson(state.view === 'batch' ? state.records : [r!]);
        break;
      case 'export-csv':
        exportCsv(state.view === 'batch' ? state.records : [r!]);
        break;
      case 'export-txt':
        if (r) exportTxt(r);
        break;
      case 'print':
        app.querySelectorAll<HTMLDetailsElement>('details').forEach((d) => (d.open = true));
        window.print();
        break;
      case 'copy':
        void navigator.clipboard?.writeText(t.dataset.copy ?? '').then(() => toast('Copied'));
        break;
      case 'copy-json':
        if (r) void navigator.clipboard?.writeText(JSON.stringify(recordToJson(r), null, 2)).then(() => toast('JSON copied'));
        break;
      case 'map-optin':
        state.mapShown = true;
        void drawMap();
        break;
      case 'clean':
        if (r) void runClean(r);
        break;
      case 'download-clean': {
        const res = r && state.clean.get(r.id)?.result?.res;
        if (res) download(res.blob, res.name);
        break;
      }
      case 'inspect-clean': {
        const after = r && state.clean.get(r.id)?.result?.after;
        if (after) {
          state.records.push(after);
          state.clean.get(r!.id)!.result = undefined;
          state.current = after.id;
          state.tab = 'overview';
          render();
        }
        break;
      }
      case 'sort': {
        const key = t.dataset.key as V.SortKey;
        state.sort = { key, dir: state.sort.key === key ? ((state.sort.dir * -1) as 1 | -1) : 1 };
        render();
        break;
      }
      case 'clean-all':
        void cleanAll();
        break;
    }
  });

  root.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.matches('tr[data-action="open"]') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      t.click();
    }
    if (t.matches('.tab') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tabsEls = [...app.querySelectorAll<HTMLElement>('.tab')];
      const i = tabsEls.indexOf(t);
      const next = tabsEls[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabsEls.length) % tabsEls.length];
      setTab(next.dataset.tab as V.Tab, true);
    }
    if (e.key === 'Escape') app.querySelectorAll<HTMLElement>('.menu-list').forEach((m) => (m.hidden = true));
    if (t === dropzone && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      input.click();
    }
  });

  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const r = currentRecord();
    if (t.dataset.input === 'query' && r) {
      state.query = t.value;
      const list = app.querySelector<HTMLElement>('[data-fields]');
      if (list) list.innerHTML = V.allFieldsList(r, state.query, state.showRaw);
    }
  });

  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const r = currentRecord();
    const cs = r ? cleanStateFor(r.id) : undefined;
    switch (t.dataset.input) {
      case 'raw':
        state.showRaw = t.checked;
        render();
        break;
      case 'preset':
        if (cs) {
          cs.preset = t.value as V.PresetId;
          cs.result = undefined;
          render();
        }
        break;
      case 'cat':
        if (cs) t.checked ? cs.custom.add(t.value as CleanCategory) : cs.custom.delete(t.value as CleanCategory);
        break;
      case 'keepIcc':
        if (cs) cs.keepIcc = t.checked;
        break;
      case 'keepOrientation':
        if (cs) cs.keepOrientation = t.checked;
        break;
      case 'batch-preset':
        state.batchPreset = (t as unknown as HTMLSelectElement).value as V.PresetId;
        break;
    }
  });

  input.addEventListener('change', () => {
    if (input.files?.length) void addFiles(input.files, state.view !== 'empty');
    input.value = '';
  });

  dropzone.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-action]')) return;
    input.click();
  });

  // Page-wide drag & drop with an overlay, so users can drop anywhere.
  let depth = 0;
  const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth++;
    document.body.classList.add('dragging');
    dropzone.classList.add('drag');
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) {
      document.body.classList.remove('dragging');
      dropzone.classList.remove('drag');
    }
  });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging');
    dropzone.classList.remove('drag');
    if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files, state.view !== 'empty');
  });
  window.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (files.length) void addFiles(files, state.view !== 'empty');
  });
}
