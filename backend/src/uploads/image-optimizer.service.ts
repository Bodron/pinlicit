import { BadRequestException, Injectable } from "@nestjs/common";
const sharp: typeof import("sharp").default = require("sharp");
import {
  IMAGE_PRESETS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
} from "./image-policy";

// Bound libvips threads/cache independently of the HTTP upload admission limit.
sharp.concurrency(1);
sharp.cache({ memory: 32, files: 0, items: 64 });

@Injectable()
export class ImageOptimizer {
  async optimize(input: Buffer) {
    if (!input?.length || input.length > MAX_IMAGE_BYTES)
      throw new BadRequestException("Use an image up to 10 MB.");
    try {
      const options = {
        limitInputPixels: MAX_IMAGE_PIXELS,
        failOn: "error" as const,
      };
      const metadata = await sharp(input, options).metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format) ||
        (metadata.pages || 1) !== 1
      )
        throw new Error("Unsupported image");
      const variants = new Map<
        string,
        { data: Buffer; width: number; height: number; bytes: number }
      >();
      for (const preset of IMAGE_PRESETS) {
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
        // A small source is stored once, at the highest preset quality.
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
        if (
          candidate.width <= larger.width * 0.8 &&
          candidate.bytes <= larger.bytes * 0.8
        )
          selected.push(candidate);
      }
      return selected.reverse();
    } catch {
      throw new BadRequestException(
        "Use a valid, non-animated JPG, PNG or WebP image up to 40 megapixels.",
      );
    }
  }
}
