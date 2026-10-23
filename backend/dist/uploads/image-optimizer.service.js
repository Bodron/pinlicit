"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageOptimizer = void 0;
const common_1 = require("@nestjs/common");
const sharp = require("sharp");
const image_policy_1 = require("./image-policy");
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 64 });
let ImageOptimizer = class ImageOptimizer {
    async optimize(input) {
        if (!input?.length || input.length > image_policy_1.MAX_IMAGE_BYTES)
            throw new common_1.BadRequestException("Use an image up to 10 MB.");
        try {
            const options = {
                limitInputPixels: image_policy_1.MAX_IMAGE_PIXELS,
                failOn: "error",
            };
            const metadata = await sharp(input, options).metadata();
            if (!["jpeg", "png", "webp"].includes(metadata.format) ||
                (metadata.pages || 1) !== 1)
                throw new Error("Unsupported image");
            const variants = new Map();
            for (const preset of image_policy_1.IMAGE_PRESETS) {
                const { data, info } = await sharp(input, options)
                    .rotate()
                    .resize({
                    width: preset.width,
                    height: preset.height,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                    .toColourspace("srgb")
                    .webp({
                    quality: preset.quality,
                    alphaQuality: 100,
                    effort: 5,
                    smartSubsample: true,
                    lossless: Boolean(metadata.hasAlpha || metadata.isPalette),
                })
                    .timeout({ seconds: 20 })
                    .toBuffer({ resolveWithObject: true });
                variants.set(`${info.width}x${info.height}`, {
                    data,
                    width: info.width,
                    height: info.height,
                    bytes: data.length,
                });
            }
            const sorted = [...variants.values()].sort((a, b) => b.width - a.width);
            const selected = [sorted[0]];
            for (const candidate of sorted.slice(1)) {
                const larger = selected[selected.length - 1];
                if (candidate.width <= larger.width * 0.8 &&
                    candidate.bytes <= larger.bytes * 0.8)
                    selected.push(candidate);
            }
            return selected.reverse();
        }
        catch {
            throw new common_1.BadRequestException("Use a valid, non-animated JPG, PNG or WebP image up to 40 megapixels.");
        }
    }
};
exports.ImageOptimizer = ImageOptimizer;
exports.ImageOptimizer = ImageOptimizer = __decorate([
    (0, common_1.Injectable)()
], ImageOptimizer);
//# sourceMappingURL=image-optimizer.service.js.map