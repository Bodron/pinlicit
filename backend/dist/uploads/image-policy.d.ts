export declare const MAX_IMAGE_BYTES: number;
export declare const MAX_IMAGE_PIXELS = 40000000;
export declare const IMAGE_PIPELINE_VERSION = "v1";
export declare const IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
export type ImageVariant = {
    key: string;
    url: string;
    width: number;
    height: number;
    bytes: number;
    contentType: "image/webp";
};
export declare const IMAGE_PRESETS: {
    width: number;
    height: number;
    quality: number;
}[];
