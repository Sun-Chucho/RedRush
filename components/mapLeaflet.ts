export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapMarkerData = {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  rotation?: number;
  kind?: 'rider' | 'customer' | 'restaurant';
};

export type MapPolylineData = {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
};

export function markerKind(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('rider') || lower.includes('your location')) return 'rider';
  if (lower.includes('your') || lower.includes('customer') || lower.includes('delivery')) return 'customer';
  return 'restaurant';
}

export function createMapPayload(region: MapRegion, markers: MapMarkerData[], polylines: MapPolylineData[]) {
  return {
    center: [region.latitude, region.longitude],
    zoom: Math.max(13, Math.min(17, Math.round(15 - Math.log2(region.latitudeDelta || 0.03)))),
    markers: markers.map(marker => ({
      lat: marker.coordinate.latitude,
      lng: marker.coordinate.longitude,
      title: marker.title || '',
      description: marker.description || '',
      kind: marker.kind || markerKind(marker.title),
      rotation: marker.rotation || 0,
    })),
    polylines: polylines.map(line => ({
      points: line.coordinates.map(coord => [coord.latitude, coord.longitude]),
      color: '#CC0000',
      weight: Math.max(4, line.strokeWidth || 4),
      dashArray: line.lineDashPattern?.length ? '8 7' : null,
    })),
  };
}

export function leafletHtml(initialPayload: ReturnType<typeof createMapPayload>) {
  const payload = JSON.stringify(initialPayload).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #151010; }
    .redrush-pin { width: 42px; height: 42px; border-radius: 22px; display: grid; place-items: center; background: #CC0000; border: 3px solid #fff; box-shadow: 0 8px 22px rgba(80,0,0,.42); color: #fff; }
    .redrush-pin.restaurant { border-radius: 12px; background: #990000; }
    .redrush-pin.customer { background: #E62020; }
    .redrush-pin.rider { animation: riderPulse 1.5s infinite ease-in-out; }
    .redrush-pin svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .redrush-pin .heading { display: grid; place-items: center; transition: transform .35s ease; }
    .leaflet-control-attribution { font-size: 9px; }
    @keyframes riderPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(204,0,0,.38), 0 8px 22px rgba(80,0,0,.42); } 50% { box-shadow: 0 0 0 10px rgba(204,0,0,0), 0 8px 22px rgba(80,0,0,.42); } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const initialData = ${payload};
    const map = L.map('map', { zoomControl: false, attributionControl: true }).setView(initialData.center, initialData.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const markerLayers = {};
    const routeLayers = [];
    let firstRender = true;

    function iconSvg(kind) {
      if (kind === 'rider') return '<svg viewBox="0 0 24 24"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h7M9 7h4l2 7h3M9 7l-2 7h8M13 7l2-2"/></svg>';
      if (kind === 'customer') return '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/></svg>';
      return '<svg viewBox="0 0 24 24"><path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10v11M9.5 3v4.5A2.5 2.5 0 0 1 7 10M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>';
    }

    function makeIcon(marker) {
      return L.divIcon({
        html: '<div class="redrush-pin ' + marker.kind + '"><span class="heading" style="transform:rotate(' + marker.rotation + 'deg)">' + iconSvg(marker.kind) + '</span></div>',
        className: '', iconSize: [48, 48], iconAnchor: [24, 24]
      });
    }

    function animateMarker(layer, target) {
      const start = layer.getLatLng();
      const started = performance.now();
      const token = (layer._redrushMove || 0) + 1;
      layer._redrushMove = token;
      function frame(now) {
        if (layer._redrushMove !== token) return;
        const progress = Math.min(1, (now - started) / 1800);
        const eased = progress * (2 - progress);
        layer.setLatLng([
          start.lat + (target[0] - start.lat) * eased,
          start.lng + (target[1] - start.lng) * eased
        ]);
        if (progress < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function render(data) {
      const bounds = [];
      data.polylines.forEach((line, index) => {
        if (line.points.length < 2) return;
        bounds.push(...line.points);
        if (!routeLayers[index]) {
          routeLayers[index] = L.polyline(line.points, { color: '#CC0000', weight: line.weight, dashArray: line.dashArray, opacity: .95 }).addTo(map);
        } else {
          routeLayers[index].setLatLngs(line.points).setStyle({ color: '#CC0000', weight: line.weight, dashArray: line.dashArray });
        }
      });
      while (routeLayers.length > data.polylines.length) map.removeLayer(routeLayers.pop());

      const activeKinds = {};
      data.markers.forEach(marker => {
        const point = [marker.lat, marker.lng];
        bounds.push(point);
        activeKinds[marker.kind] = true;
        const existing = markerLayers[marker.kind];
        if (!existing) {
          markerLayers[marker.kind] = L.marker(point, { icon: makeIcon(marker), zIndexOffset: marker.kind === 'rider' ? 1000 : 0 })
            .addTo(map).bindPopup(marker.title || marker.kind);
        } else {
          animateMarker(existing, point);
          const heading = existing.getElement() && existing.getElement().querySelector('.heading');
          if (heading) heading.style.transform = 'rotate(' + marker.rotation + 'deg)';
          existing.setPopupContent(marker.title || marker.kind);
        }
      });
      Object.keys(markerLayers).forEach(kind => {
        if (!activeKinds[kind]) { map.removeLayer(markerLayers[kind]); delete markerLayers[kind]; }
      });

      if (firstRender && bounds.length > 1) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16, animate: false });
      } else if (markerLayers.rider) {
        const riderPoint = markerLayers.rider.getLatLng();
        if (!map.getBounds().pad(-0.18).contains(riderPoint)) map.panTo(riderPoint, { animate: true, duration: 1 });
      }
      firstRender = false;
    }

    function receive(raw) {
      try {
        const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (message && message.type === 'REDRUSH_MAP_UPDATE') render(message.payload);
      } catch (_) {}
    }
    window.addEventListener('message', event => receive(event.data));
    document.addEventListener('message', event => receive(event.data));
    render(initialData);
  </script>
</body>
</html>`;
}
