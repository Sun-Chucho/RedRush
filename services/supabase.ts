import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const emptyUrl = 'https://example.supabase.co';
const emptyKey = 'supabase-not-configured';

export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
export const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl || emptyUrl,
  supabasePublishableKey || emptyKey,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
    realtime: {
      // Connections from East Africa and some mobile networks can take longer
      // than the SDK's 10 s default handshake. Avoid rejecting a healthy but
      // high-latency WebSocket just before it finishes connecting.
      timeout: 30000,
      heartbeatIntervalMs: 25000,
    },
  }
);
