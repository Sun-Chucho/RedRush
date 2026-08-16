import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, createThemedStyles } from '@/constants/theme';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Coord {
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  style?: any;
  initialRegion?: Region;
  children?: React.ReactNode;
}

interface MarkerProps {
  coordinate: Coord;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

interface PolylineProps {
  coordinates: Coord[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

type MarkerData = Required<Pick<MarkerProps, 'coordinate'>> & Pick<MarkerProps, 'title' | 'description'>;
type PolylineData = Required<Pick<PolylineProps, 'coordinates'>> & Pick<PolylineProps, 'strokeColor' | 'strokeWidth' | 'lineDashPattern'>;

function collectMapChildren(children: React.ReactNode) {
  const markers: MarkerData[] = [];
  const polylines: PolylineData[] = [];

  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;

    const childType = child.type as { displayName?: string; name?: string };
    const typeName = typeof child.type === 'function'
      ? childType.displayName || childType.name
      : '';
    const props = child.props as Partial<MarkerProps & PolylineProps>;

    if (typeName === 'Marker' && props.coordinate) {
      markers.push({ coordinate: props.coordinate, title: props.title, description: props.description });
      return;
    }

    if (typeName === 'Polyline' && Array.isArray(props.coordinates)) {
      polylines.push({
        coordinates: props.coordinates,
        strokeColor: props.strokeColor,
        strokeWidth: props.strokeWidth,
        lineDashPattern: props.lineDashPattern,
      });
      return;
    }

    if (props.children) {
      const nested = collectMapChildren(props.children);
      markers.push(...nested.markers);
      polylines.push(...nested.polylines);
    }
  });

  return { markers, polylines };
}

function markerKind(title = '') {
  const lower = title.toLowerCase();
  if (lower.includes('rider')) return 'rider';
  if (lower.includes('your') || lower.includes('customer')) return 'customer';
  return 'restaurant';
}

function leafletHtml(region: Region, markers: MarkerData[], polylines: PolylineData[]) {
  const payload = JSON.stringify({
    center: [region.latitude, region.longitude],
    zoom: Math.max(13, Math.min(17, Math.round(15 - Math.log2(region.latitudeDelta || 0.03)))),
    markers: markers.map(marker => ({
      lat: marker.coordinate.latitude,
      lng: marker.coordinate.longitude,
      title: marker.title || '',
      description: marker.description || '',
      kind: markerKind(marker.title),
    })),
    polylines: polylines.map(line => ({
      points: line.coordinates.map(coord => [coord.latitude, coord.longitude]),
      color: line.strokeColor || '#CC0000',
      weight: line.strokeWidth || 4,
      dashArray: line.lineDashPattern?.length ? '6 6' : null,
    })),
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #151010; }
    .pin { width: 34px; height: 34px; border-radius: 18px; display: grid; place-items: center; border: 3px solid #fff; box-shadow: 0 8px 20px rgba(0,0,0,.35); color: #fff; font: 700 16px system-ui; }
    .pin.rider { background: #cc0000; animation: pulse 1.2s infinite ease-in-out; }
    .pin.customer { background: #00a86b; }
    .pin.restaurant { background: #f59e0b; border-radius: 9px; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.14); } }
    .leaflet-control-attribution { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const data = ${payload};
    const map = L.map('map', { zoomControl: false }).setView(data.center, data.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const bounds = [];
    const iconText = { rider: 'R', customer: 'C', restaurant: 'S' };
    data.polylines.forEach(line => {
      if (line.points.length < 2) return;
      L.polyline(line.points, { color: line.color, weight: line.weight, dashArray: line.dashArray }).addTo(map);
      line.points.forEach(point => bounds.push(point));
    });
    data.markers.forEach(marker => {
      const point = [marker.lat, marker.lng];
      bounds.push(point);
      const icon = L.divIcon({
        html: '<div class="pin ' + marker.kind + '">' + iconText[marker.kind] + '</div>',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      L.marker(point, { icon }).addTo(map).bindPopup(marker.title || marker.kind);
    });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  </script>
</body>
</html>`;
}

export function MapView({ style, initialRegion, children }: MapViewProps) {
  const region = initialRegion || {
    latitude: 6.45,
    longitude: 3.4,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };
  const { markers, polylines } = collectMapChildren(children);
  const html = leafletHtml(region, markers, polylines);

  return (
    <View style={[styles.wrapper, style]}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="RedRush Live Map"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>OpenStreetMap</Text>
      </View>
    </View>
  );
}

export function Marker(_props: MarkerProps) {
  return null;
}
Marker.displayName = 'Marker';

export function Polyline(_props: PolylineProps) {
  return null;
}
Polyline.displayName = 'Polyline';

export default MapView;

const styles = createThemedStyles(() => ({
  wrapper: {
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },
  badge: {
    position: 'absolute' as any,
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(10,10,10,0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
}));
