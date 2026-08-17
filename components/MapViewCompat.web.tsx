import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Colors, createThemedStyles } from '@/constants/theme';
import { createMapPayload, leafletHtml, MapMarkerData, MapPolylineData, MapRegion } from './mapLeaflet';

interface MapViewProps { style?: any; initialRegion?: MapRegion; children?: React.ReactNode }
interface MarkerProps extends MapMarkerData { children?: React.ReactNode }
interface PolylineProps extends MapPolylineData {}

function collectMapChildren(children: React.ReactNode) {
  const markers: MapMarkerData[] = [];
  const polylines: MapPolylineData[] = [];
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;
    const childType = child.type as { displayName?: string; name?: string };
    const typeName = typeof child.type === 'function' ? childType.displayName || childType.name : '';
    const props = child.props as Partial<MarkerProps & PolylineProps>;
    if (typeName === 'Marker' && props.coordinate) {
      markers.push({ coordinate: props.coordinate, title: props.title, description: props.description, rotation: props.rotation, kind: props.kind });
    } else if (typeName === 'Polyline' && Array.isArray(props.coordinates)) {
      polylines.push({ coordinates: props.coordinates, strokeColor: props.strokeColor, strokeWidth: props.strokeWidth, lineDashPattern: props.lineDashPattern });
    }
    if (props.children) {
      const nested = collectMapChildren(props.children);
      markers.push(...nested.markers);
      polylines.push(...nested.polylines);
    }
  });
  return { markers, polylines };
}

export function MapView({ style, initialRegion, children }: MapViewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const region = initialRegion || { latitude: -1.2833, longitude: 36.8172, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  const { markers, polylines } = collectMapChildren(children);
  const payload = createMapPayload(region, markers, polylines);
  const payloadJson = JSON.stringify(payload);
  const [initialHtml] = useState(() => leafletHtml(payload));
  const sendUpdate = () => iframeRef.current?.contentWindow?.postMessage({ type: 'REDRUSH_MAP_UPDATE', payload }, '*');

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'REDRUSH_MAP_UPDATE', payload: JSON.parse(payloadJson) }, '*');
  }, [payloadJson]);

  return (
    <View style={[styles.wrapper, style]}>
      <iframe ref={iframeRef} srcDoc={initialHtml} onLoad={sendUpdate} style={{ width: '100%', height: '100%', border: 'none' }} title="RedRush Live Route" />
      <View style={styles.badge} pointerEvents="none"><Text style={styles.badgeText}>LIVE ROUTE</Text></View>
    </View>
  );
}

export function Marker(_props: MarkerProps) { return null; }
Marker.displayName = 'Marker';
export function Polyline(_props: PolylineProps) { return null; }
Polyline.displayName = 'Polyline';
export default MapView;

const styles = createThemedStyles(() => ({
  wrapper: { backgroundColor: Colors.surfaceElevated, overflow: 'hidden' as const, position: 'relative' as const },
  badge: { position: 'absolute' as const, bottom: 8, right: 8, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
}));
