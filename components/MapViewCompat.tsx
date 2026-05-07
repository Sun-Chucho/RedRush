// Fallback for environments where neither .native.tsx nor .web.tsx is picked up.
// In practice Metro/Expo should always resolve to the platform-specific file first.
// This file re-exports the web stub so it never imports react-native-maps on web.
export { MapView, Marker, Polyline } from './MapViewCompat.web';
export { default } from './MapViewCompat.web';
