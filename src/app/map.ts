// Map is opt-in and lazy-loaded: Leaflet (and its CSS) are only fetched after
// the user asks, and tiles are only requested at that point.
export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
}

export async function showMap(el: HTMLElement, points: MapPoint[]) {
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  el.innerHTML = '';
  const map = L.map(el, { scrollWheelZoom: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
  }).addTo(map);
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--high').trim() || '#c4321f';
  const markers = points.map((p) =>
    L.circleMarker([p.lat, p.lon], { radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 })
      .bindTooltip(p.label)
      .addTo(map),
  );
  if (points.length === 1) map.setView([points[0].lat, points[0].lon], 15);
  else map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2), { maxZoom: 15 });
  return map;
}
