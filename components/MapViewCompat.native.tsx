import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const lat = initialRegion?.latitude ?? -1.2833;
  const lng = initialRegion?.longitude ?? 36.8172;
  const latSpan = Math.max(initialRegion?.latitudeDelta ?? 0.03, 0.01);
  const lngSpan = Math.max(initialRegion?.longitudeDelta ?? 0.03, 0.01);
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - lngSpan},${lat - latSpan},${lng + lngSpan},${lat + latSpan}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <View style={[styles.wrapper, style]}>
      <WebView
        source={{ uri: url }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        style={styles.webView}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Live map</Text>
      </View>
    </View>
  );
}

export function Marker(_props: MarkerProps) {
  return null;
}

export function Polyline(_props: PolylineProps) {
  return null;
}

export default MapView;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    position: 'relative',
  },
  webView: {
    backgroundColor: Colors.surfaceElevated,
    flex: 1,
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(10,10,10,0.75)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
