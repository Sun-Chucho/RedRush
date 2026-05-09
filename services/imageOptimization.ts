import { Image as ExpoImage } from 'expo-image';
import { Platform } from 'react-native';

/**
 * Image Optimization Service
 * Handles caching, compression, and optimization of images across the app
 */

export const imageCache = {
  /**
   * Cache configuration for better image loading performance
   */
  cacheOptions: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    compression: 0.9,
  },

  /**
   * Get optimized image source with caching
   */
  getOptimizedSource: (source: any, width?: number, height?: number) => {
    if (typeof source === 'string') {
      return {
        uri: source,
        headers: {
          'Cache-Control': 'public, max-age=2592000', // 30 days
        },
        cache: Platform.OS === 'web' ? 'force-cache' : 'default',
      };
    }
    return source;
  },

  /**
   * Preload images for faster rendering
   */
  preloadImages: async (imageSources: any[]) => {
    if (Platform.OS === 'web') return;
    
    try {
      await Promise.all(
        imageSources.map((source) =>
          ExpoImage.prefetch(source)
        )
      );
    } catch (error) {
      console.warn('Failed to preload images:', error);
    }
  },

  /**
   * Image dimensions for responsive design
   */
  getResponsiveDimensions: (containerWidth: number, aspectRatio: number = 16 / 9) => {
    const maxWidth = Math.min(containerWidth, 1200);
    const width = Math.max(maxWidth, 320);
    const height = width / aspectRatio;

    return { width, height };
  },
};

export default imageCache;
