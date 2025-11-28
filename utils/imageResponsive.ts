/**
 * Responsive Image Utility
 *
 * Generates multiple image sizes for responsive loading.
 * Reduces bandwidth usage by serving appropriately-sized images.
 *
 * Usage:
 *   // Generate responsive sizes
 *   const sizes = generateResponsiveSizes(1920, 1080);
 *   // => [{ width: 320, height: 180, suffix: 'xs' }, ...]
 *
 *   // Get srcset string
 *   const srcset = getImageSrcSet('/images/hero.jpg');
 *   // => '/images/hero-xs.jpg 320w, /images/hero-sm.jpg 640w, ...'
 *
 *   // Get optimal size for device
 *   const size = getOptimalImageSize(375); // iPhone width
 *   // => 'sm'
 */

export interface ImageSize {
  width: number;
  height?: number;
  suffix: string;
  label: string;
}

export interface ResponsiveImageConfig {
  sizes: ImageSize[];
  quality?: number;
  formats?: ('webp' | 'avif' | 'jpeg' | 'png')[];
}

/**
 * Standard responsive breakpoints
 */
export const RESPONSIVE_BREAKPOINTS: ImageSize[] = [
  { width: 320, suffix: 'xs', label: 'Extra Small (Mobile)' },
  { width: 640, suffix: 'sm', label: 'Small (Mobile)' },
  { width: 768, suffix: 'md', label: 'Medium (Tablet)' },
  { width: 1024, suffix: 'lg', label: 'Large (Desktop)' },
  { width: 1280, suffix: 'xl', label: 'Extra Large (Desktop)' },
  { width: 1920, suffix: '2xl', label: '2X Large (HD)' },
];

/**
 * Generate responsive image sizes maintaining aspect ratio
 */
export function generateResponsiveSizes(
  originalWidth: number,
  originalHeight: number,
  breakpoints: ImageSize[] = RESPONSIVE_BREAKPOINTS
): ImageSize[] {
  const aspectRatio = originalHeight / originalWidth;

  return breakpoints
    .filter((bp) => bp.width <= originalWidth) // Don't upscale
    .map((bp) => ({
      ...bp,
      height: Math.round(bp.width * aspectRatio),
    }));
}

/**
 * Get srcset string for HTML/React
 */
export function getImageSrcSet(imagePath: string, sizes?: ImageSize[]): string {
  const responsiveSizes = sizes || RESPONSIVE_BREAKPOINTS;
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));

  return responsiveSizes.map((size) => `${basePath}-${size.suffix}${ext} ${size.width}w`).join(', ');
}

/**
 * Get sizes attribute for HTML/React
 */
export function getImageSizesAttr(
  breakpoints: { maxWidth: number; size: string }[] = [
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 768, size: '50vw' },
    { maxWidth: 1024, size: '33vw' },
    { maxWidth: 9999, size: '25vw' },
  ]
): string {
  return breakpoints
    .map((bp, index) => {
      if (index === breakpoints.length - 1) {
        return bp.size; // Last one doesn't need media query
      }
      return `(max-width: ${bp.maxWidth}px) ${bp.size}`;
    })
    .join(', ');
}

/**
 * Get optimal image size for device width
 */
export function getOptimalImageSize(deviceWidth: number, breakpoints: ImageSize[] = RESPONSIVE_BREAKPOINTS): string {
  // Find the smallest size that's >= device width
  const optimal = breakpoints.find((bp) => bp.width >= deviceWidth);
  return optimal?.suffix || breakpoints[breakpoints.length - 1].suffix;
}

/**
 * Get responsive image URL for a given device width
 */
export function getResponsiveImageUrl(imagePath: string, deviceWidth: number): string {
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));
  const size = getOptimalImageSize(deviceWidth);

  return `${basePath}-${size}${ext}`;
}

/**
 * Convert image path to WebP
 */
export function getWebPPath(imagePath: string): string {
  return imagePath.replace(/\.(png|jpe?g)$/i, '.webp');
}

/**
 * Convert image path to AVIF
 */
export function getAVIFPath(imagePath: string): string {
  return imagePath.replace(/\.(png|jpe?g)$/i, '.avif');
}

/**
 * Generate picture element srcset with modern formats
 */
export function generatePictureSources(
  imagePath: string,
  sizes?: ImageSize[]
): {
  avif?: string;
  webp?: string;
  fallback: string;
} {
  const srcset = getImageSrcSet(imagePath, sizes);

  return {
    avif: getImageSrcSet(getAVIFPath(imagePath), sizes),
    webp: getImageSrcSet(getWebPPath(imagePath), sizes),
    fallback: srcset,
  };
}

/**
 * Calculate image file size budget based on viewport
 */
export function getImageBudget(viewportWidth: number): {
  maxSize: number; // in KB
  recommendedSize: number; // in KB
} {
  // Budget scales with viewport
  if (viewportWidth <= 640) {
    return { maxSize: 100, recommendedSize: 50 }; // Mobile
  } else if (viewportWidth <= 1024) {
    return { maxSize: 200, recommendedSize: 100 }; // Tablet
  } else {
    return { maxSize: 400, recommendedSize: 200 }; // Desktop
  }
}

/**
 * React Native: Get optimal image URI based on screen density
 */
export function getOptimalImageForDensity(imagePath: string, pixelRatio: number): string {
  const ext = imagePath.substring(imagePath.lastIndexOf('.'));
  const basePath = imagePath.substring(0, imagePath.lastIndexOf('.'));

  // React Native naming convention: @2x, @3x
  if (pixelRatio >= 3) {
    return `${basePath}@3x${ext}`;
  } else if (pixelRatio >= 2) {
    return `${basePath}@2x${ext}`;
  } else {
    return imagePath;
  }
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      // React Native doesn't have Image constructor
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<void> {
  await Promise.all(srcs.map(preloadImage));
}
