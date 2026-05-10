/**
 * Environment validation service
 * Validates required config at startup and provides typed accessors.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cloudinaryCloudName: string | null;
  cloudinaryUploadPreset: string | null;
  isSupabaseReady: boolean;
  isCloudinaryReady: boolean;
}

function getEnv(key: string): string {
  return (process.env[key] || '').trim();
}

export function validateEnv(): EnvConfig {
  const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey =
    getEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  const cloudinaryCloudName = getEnv('EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME') || null;
  const cloudinaryUploadPreset = getEnv('EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET') || null;

  const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
  const isCloudinaryReady = Boolean(cloudinaryCloudName && cloudinaryUploadPreset);

  if (!isSupabaseReady) {
    console.warn(
      '[RedRush] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file. ' +
      'The app will not be able to authenticate or load real data.'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    cloudinaryCloudName,
    cloudinaryUploadPreset,
    isSupabaseReady,
    isCloudinaryReady,
  };
}

export const env = validateEnv();
export default env;
