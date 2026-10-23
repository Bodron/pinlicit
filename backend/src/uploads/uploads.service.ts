import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { ImageAsset } from "./image-asset.schema";
import { ImageOptimizer } from "./image-optimizer.service";
import {
  IMAGE_CACHE_CONTROL,
  IMAGE_PIPELINE_VERSION,
  ImageVariant,
} from "./image-policy";

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  constructor(
    private readonly config: ConfigService,
    @InjectModel(ImageAsset.name) private readonly assets: Model<ImageAsset>,
    private readonly optimizer: ImageOptimizer,
  ) {
    this.s3 = new S3Client({
      region: config.get<string>("AWS_REGION") || "eu-central-1",
    });
  }

  private url(key: string) {
    const base =
      this.config.get<string>("PUBLIC_IMAGE_BASE_URL")?.replace(/\/$/, "") ||
      `https://${this.config.get<string>("AWS_S3_BUCKET")}.s3.${this.config.get<string>("AWS_REGION") || "eu-central-1"}.amazonaws.com`;
    return `${base}/${key}`;
  }
  private result(asset: ImageAsset) {
    const variants = asset.variants.map((variant) => ({
      ...variant,
      url: this.url(variant.key),
    }));
    const primary = variants[variants.length - 1];
    return {
      imageKey: primary.key,
      imageUrl: primary.url,
      variants,
      sourceBytes: asset.sourceBytes,
      totalBytes: asset.totalBytes,
    };
  }

  async uploadImage(owner: string, input: Buffer) {
    const bucket = this.config.get<string>("AWS_S3_BUCKET");
    if (!bucket)
      throw new ServiceUnavailableException("Image storage is not configured.");
    const id = createHash("sha256")
      .update(IMAGE_PIPELINE_VERSION)
      .update(owner)
      .update(input)
      .digest("hex");
    const existing = await this.assets.findById(id).lean();
    if (existing?.status === "ready") return this.result(existing);
    const lease = randomUUID();
    try {
      // Durable, bounded claim: duplicate requests share one content-addressed asset.
      await this.assets.findOneAndUpdate(
        {
          _id: id,
          $or: [
            { status: "failed" },
            {
              status: "processing",
              processingStartedAt: { $lt: new Date(Date.now() - 300000) },
            },
          ],
        },
        {
          $set: {
            owner,
            status: "processing",
            lease,
            processingStartedAt: new Date(),
            sourceBytes: input.length,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const ready = await this.assets.findById(id).lean();
      if (ready?.status === "ready") return this.result(ready);
      throw new ConflictException(
        "This image is already being processed. Retry shortly.",
      );
    }
    try {
      const encoded = await this.optimizer.optimize(input);
      const variants: ImageVariant[] = encoded.map((variant) => ({
        key: `images/${IMAGE_PIPELINE_VERSION}/${id}/${variant.width}x${variant.height}.webp`,
        url: "",
        width: variant.width,
        height: variant.height,
        bytes: variant.bytes,
        contentType: "image/webp",
      }));
      // Persist planned keys before S3 writes, so failed attempts remain auditable/retryable.
      await this.assets.updateOne({ _id: id, lease }, { $set: { variants } });
      for (let index = 0; index < encoded.length; index++) {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: variants[index].key,
            Body: encoded[index].data,
            ContentType: "image/webp",
            ContentLength: encoded[index].bytes,
            CacheControl: IMAGE_CACHE_CONTROL,
          }),
          { abortSignal: AbortSignal.timeout(15000) },
        );
      }
      const asset = await this.assets
        .findOneAndUpdate(
          { _id: id, lease, status: "processing" },
          {
            $set: {
              status: "ready",
              imageKey: variants[variants.length - 1].key,
              totalBytes: variants.reduce((sum, item) => sum + item.bytes, 0),
            },
          },
          { new: true },
        )
        .lean();
      if (!asset)
        throw new ConflictException("Image processing expired. Retry shortly.");
      return this.result(asset);
    } catch (error) {
      await this.assets.updateOne(
        { _id: id, lease, status: "processing" },
        { $set: { status: "failed" } },
      );
      if (error.getStatus) throw error;
      throw new ServiceUnavailableException(
        "Image storage is unavailable. Retry shortly.",
      );
    }
  }

  async requireImage(imageKey: string, owner: string) {
    const asset = await this.assets
      .findOneAndUpdate(
        { imageKey, owner, status: "ready" },
        { $set: { lastReferencedAt: new Date() } },
        { new: true },
      )
      .lean();
    if (!asset)
      throw new ForbiddenException(
        "Upload and optimize your own image before publishing.",
      );
    return this.result(asset);
  }
}
