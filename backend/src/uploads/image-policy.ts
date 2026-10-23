export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const IMAGE_PIPELINE_VERSION = "v1";
export const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export type ImageVariant = {
  key: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  contentType: "image/webp";
};
export const IMAGE_PRESETS = [
  { width: 320, height: 640, quality: 82 },
  { width: 960, height: 1920, quality: 85 },
  { width: 1920, height: 2560, quality: 88 },
];
