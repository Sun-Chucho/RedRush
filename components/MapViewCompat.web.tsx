// Web stub — react-native-maps is not supported on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapViewProps {
  style?: any;
  initialRegion?: Region;
  children?: React.ReactNode;
}

export function MapView({ style, children }: MapViewProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.text}>Map View</Text>
      <Text style={styles.sub}>Available on mobile devices</Text>
    </View>
  );
}

export function Marker(_props: any) {
  return null;
}

export function Polyline(_props: any) {
  return null;
}

export default MapView;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  icon: { fontSize: 32 },
  text: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  sub: { color: Colors.textMuted, fontSize: 12 },
});
