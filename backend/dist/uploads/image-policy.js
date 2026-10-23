"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_PRESETS = exports.IMAGE_CACHE_CONTROL = exports.IMAGE_PIPELINE_VERSION = exports.MAX_IMAGE_PIXELS = exports.MAX_IMAGE_BYTES = void 0;
exports.MAX_IMAGE_BYTES = 10 * 1024 * 1024;
exports.MAX_IMAGE_PIXELS = 40_000_000;
exports.IMAGE_PIPELINE_VERSION = "v1";
exports.IMAGE_CACHE_CONTROL = "public, max-age=31536000, immutable";
exports.IMAGE_PRESETS = [
    { width: 320, height: 640, quality: 82 },
    { width: 960, height: 1920, quality: 85 },
    { width: 1920, height: 2560, quality: 88 },
];
//# sourceMappingURL=image-policy.js.map