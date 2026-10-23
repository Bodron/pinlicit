"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const client_s3_1 = require("@aws-sdk/client-s3");
const node_crypto_1 = require("node:crypto");
const image_asset_schema_1 = require("./image-asset.schema");
const image_optimizer_service_1 = require("./image-optimizer.service");
const image_policy_1 = require("./image-policy");
let UploadsService = class UploadsService {
    constructor(config, assets, optimizer) {
        this.config = config;
        this.assets = assets;
        this.optimizer = optimizer;
        this.s3 = new client_s3_1.S3Client({
            region: config.get("AWS_REGION") || "eu-central-1",
        });
    }
    url(key) {
        const base = this.config.get("PUBLIC_IMAGE_BASE_URL")?.replace(/\/$/, "") ||
            `https://${this.config.get("AWS_S3_BUCKET")}.s3.${this.config.get("AWS_REGION") || "eu-central-1"}.amazonaws.com`;
        return `${base}/${key}`;
    }
    result(asset) {
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
    async uploadImage(owner, input) {
        const bucket = this.config.get("AWS_S3_BUCKET");
        if (!bucket)
            throw new common_1.ServiceUnavailableException("Image storage is not configured.");
        const id = (0, node_crypto_1.createHash)("sha256")
            .update(image_policy_1.IMAGE_PIPELINE_VERSION)
            .update(owner)
            .update(input)
            .digest("hex");
        const existing = await this.assets.findById(id).lean();
        if (existing?.status === "ready")
            return this.result(existing);
        const lease = (0, node_crypto_1.randomUUID)();
        try {
            await this.assets.findOneAndUpdate({
                _id: id,
                $or: [
                    { status: "failed" },
                    {
                        status: "processing",
                        processingStartedAt: { $lt: new Date(Date.now() - 300000) },
                    },
                ],
            }, {
                $set: {
                    owner,
                    status: "processing",
                    lease,
                    processingStartedAt: new Date(),
                    sourceBytes: input.length,
                },
            }, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
            const ready = await this.assets.findById(id).lean();
            if (ready?.status === "ready")
                return this.result(ready);
            throw new common_1.ConflictException("This image is already being processed. Retry shortly.");
        }
        try {
            const encoded = await this.optimizer.optimize(input);
            const variants = encoded.map((variant) => ({
                key: `images/${image_policy_1.IMAGE_PIPELINE_VERSION}/${id}/${variant.width}x${variant.height}.webp`,
                url: "",
                width: variant.width,
                height: variant.height,
                bytes: variant.bytes,
                contentType: "image/webp",
            }));
            await this.assets.updateOne({ _id: id, lease }, { $set: { variants } });
            for (let index = 0; index < encoded.length; index++) {
                await this.s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: variants[index].key,
                    Body: encoded[index].data,
                    ContentType: "image/webp",
                    ContentLength: encoded[index].bytes,
                    CacheControl: image_policy_1.IMAGE_CACHE_CONTROL,
                }), { abortSignal: AbortSignal.timeout(15000) });
            }
            const asset = await this.assets
                .findOneAndUpdate({ _id: id, lease, status: "processing" }, {
                $set: {
                    status: "ready",
                    imageKey: variants[variants.length - 1].key,
                    totalBytes: variants.reduce((sum, item) => sum + item.bytes, 0),
                },
            }, { new: true })
                .lean();
            if (!asset)
                throw new common_1.ConflictException("Image processing expired. Retry shortly.");
            return this.result(asset);
        }
        catch (error) {
            await this.assets.updateOne({ _id: id, lease, status: "processing" }, { $set: { status: "failed" } });
            if (error.getStatus)
                throw error;
            throw new common_1.ServiceUnavailableException("Image storage is unavailable. Retry shortly.");
        }
    }
    async requireImage(imageKey, owner) {
        const asset = await this.assets
            .findOneAndUpdate({ imageKey, owner, status: "ready" }, { $set: { lastReferencedAt: new Date() } }, { new: true })
            .lean();
        if (!asset)
            throw new common_1.ForbiddenException("Upload and optimize your own image before publishing.");
        return this.result(asset);
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectModel)(image_asset_schema_1.ImageAsset.name)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mongoose_2.Model,
        image_optimizer_service_1.ImageOptimizer])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map