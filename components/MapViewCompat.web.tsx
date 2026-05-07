// Web stub — react-native-maps is not supported on web
// On web we render an OpenStreetMap iframe via react-leaflet or a static embed
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

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

export function MapView({ style, initialRegion }: MapViewProps) {
  const lat = initialRegion?.latitude ?? 6.45;
  const lng = initialRegion?.longitude ?? 3.40;
  const zoom = 14;

  const tileUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <View style={[styles.wrapper, style]}>
      <iframe
        src={tileUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="RedRush Live Map"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>🗺 OpenStreetMap • Web Preview</Text>
      </View>
    </View>
  );
}

export function Marker(_props: MarkerProps) {
  return null; // Handled by iframe tile
}

export function Polyline(_props: PolylineProps) {
  return null;
}

export default MapView;

const styles = StyleSheet.create({
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
  badgeText: { color: Colors.textSecondary, fontSize: 10 },
});
