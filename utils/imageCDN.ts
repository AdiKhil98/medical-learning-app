/**
 * Image CDN Integration
 *
 * Supports Cloudinary and ImageKit for optimized image delivery.
 * Automatically applies transformations, format conversion, and optimization.
 *
 * Setup:
 *   1. Add to .env:
 *      IMAGE_CDN=cloudinary (or imagekit)
 *      CLOUDINARY_CLOUD_NAME=your-cloud-name
 *      IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id
 *
 *   2. Use getCDNImageUrl() to transform local paths to CDN URLs
 *
 * Usage:
 *   const url = getCDNImageUrl('/assets/hero.jpg', {
 *     width: 800,
 *     quality: 80,
 *     format: 'webp'
 *   });
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type CDNProvider = 'cloudinary' | 'imagekit' | 'none';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  gravity?: 'auto' | 'center' | 'face' | 'faces';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  progressive?: boolean;
  lossless?: boolean;
}

/**
 * Get configured CDN provider from environment
 */
function getCDNProvider(): CDNProvider {
  const provider = Constants.expoConfig?.extra?.imageCDN || process.env.IMAGE_CDN;
  if (provider === 'cloudinary' || provider === 'imagekit') {
    return provider;
  }
  return 'none';
}

/**
 * Get Cloudinary cloud name from environment
 */
function getCloudinaryCloudName(): string | undefined {
  return Constants.expoConfig?.extra?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
}

/**
 * Get ImageKit URL endpoint from environment
 */
function getImageKitEndpoint(): string | undefined {
  return Constants.expoConfig?.extra?.imagekitUrlEndpoint || process.env.IMAGEKIT_URL_ENDPOINT;
}

/**
 * Build Cloudinary transformation string
 */
function buildCloudinaryTransform(options: ImageTransformOptions): string {
  const parts: string[] = [];

  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.quality) parts.push(`q_${options.quality}`);
  if (options.crop) parts.push(`c_${options.crop}`);
  if (options.gravity) parts.push(`g_${options.gravity}`);
  if (options.blur) parts.push(`e_blur:${options.blur}`);
  if (options.sharpen) parts.push('e_sharpen');
  if (options.grayscale) parts.push('e_grayscale');
  if (options.format && options.format !== 'auto') parts.push(`f_${options.format}`);
  else if (options.format === 'auto') parts.push('f_auto');

  // Default optimizations
  parts.push('q_auto'); // Automatic quality
  parts.push('f_auto'); // Automatic format

  return parts.join(',');
}

/**
 * Build ImageKit transformation string
 */
function buildImageKitTransform(options: ImageTransformOptions): string {
  const params: Record<string, string> = {};

  if (options.width) params.w = options.width.toString();
  if (options.height) params.h = options.height.toString();
  if (options.quality) params.q = options.quality.toString();
  if (options.crop) params.c = options.crop === 'fill' ? 'at_max' : 'at_least';
  if (options.blur) params.bl = options.blur.toString();
  if (options.grayscale) params.e = 'grayscale';
  if (options.format && options.format !== 'auto') params.f = options.format;

  // Default optimizations
  params.f = params.f || 'auto'; // Auto format

  return Object.entries(params)
    .map(([k, v]) => `tr:${k}-${v}`)
    .join(',');
}

/**
 * Transform local image path to Cloudinary URL
 */
function getCloudinaryUrl(imagePath: string, options: ImageTransformOptions = {}): string {
  const cloudName = getCloudinaryCloudName();
  if (!cloudName) {
    console.warn('Cloudinary cloud name not configured');
    return imagePath;
  }

  const transform = buildCloudinaryTransform(options);

  // Remove leading slash and convert to Cloudinary path
  const cleanPath = imagePath.replace(/^\//, '').replace(/^assets\//, '');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${cleanPath}`;
}

/**
 * Transform local image path to ImageKit URL
 */
function getImageKitUrl(imagePath: string, options: ImageTransformOptions = {}): string {
  const endpoint = getImageKitEndpoint();
  if (!endpoint) {
    console.warn('ImageKit endpoint not configured');
    return imagePath;
  }

  const transform = buildImageKitTransform(options);

  // Remove leading slash
  const cleanPath = imagePath.replace(/^\//, '').replace(/^assets\//, '');

  return `${endpoint}/${transform}/${cleanPath}`;
}

/**
 * Get optimized CDN image URL
 *
 * Automatically selects configured CDN provider and applies transformations.
 * Falls back to local path if CDN not configured.
 */
export function getCDNImageUrl(imagePath: string, options: ImageTransformOptions = {}): string {
  const provider = getCDNProvider();

  // Apply default options
  const defaultOptions: ImageTransformOptions = {
    format: 'auto',
    quality: 80,
    progressive: true,
    ...options,
  };

  switch (provider) {
    case 'cloudinary':
      return getCloudinaryUrl(imagePath, defaultOptions);
    case 'imagekit':
      return getImageKitUrl(imagePath, defaultOptions);
    case 'none':
    default:
      return imagePath; // Return local path
  }
}

/**
 * Get responsive CDN image URLs for srcset
 */
export function getCDNImageSrcSet(
  imagePath: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920],
  options: Omit<ImageTransformOptions, 'width'> = {}
): string {
  return widths
    .map((width) => {
      const url = getCDNImageUrl(imagePath, { ...options, width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Preload CDN image
 */
export function preloadCDNImage(imagePath: string, options: ImageTransformOptions = {}): Promise<void> {
  if (Platform.OS !== 'web') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = getCDNImageUrl(imagePath, options);
  });
}

/**
 * Get blur placeholder URL (ultra low quality, tiny size)
 */
export function getBlurPlaceholder(imagePath: string): string {
  return getCDNImageUrl(imagePath, {
    width: 20,
    quality: 10,
    blur: 20,
    format: 'auto',
  });
}

/**
 * Get thumbnail URL
 */
export function getThumbnailUrl(imagePath: string, size: number = 150): string {
  return getCDNImageUrl(imagePath, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 80,
    format: 'auto',
  });
}

/**
 * Get avatar URL with face detection
 */
export function getAvatarUrl(imagePath: string, size: number = 100): string {
  return getCDNImageUrl(imagePath, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'face',
    quality: 85,
    format: 'auto',
  });
}

/**
 * Check if CDN is configured
 */
export function isCDNConfigured(): boolean {
  const provider = getCDNProvider();
  if (provider === 'none') return false;

  if (provider === 'cloudinary') {
    return !!getCloudinaryCloudName();
  }

  if (provider === 'imagekit') {
    return !!getImageKitEndpoint();
  }

  return false;
}

/**
 * Get CDN configuration status for debugging
 */
export function getCDNStatus(): {
  provider: CDNProvider;
  configured: boolean;
  endpoint?: string;
} {
  const provider = getCDNProvider();
  const configured = isCDNConfigured();

  let endpoint: string | undefined;
  if (provider === 'cloudinary') {
    const cloudName = getCloudinaryCloudName();
    endpoint = cloudName ? `https://res.cloudinary.com/${cloudName}` : undefined;
  } else if (provider === 'imagekit') {
    endpoint = getImageKitEndpoint();
  }

  return {
    provider,
    configured,
    endpoint,
  };
}
