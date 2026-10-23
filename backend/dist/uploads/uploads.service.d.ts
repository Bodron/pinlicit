import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import { ImageAsset } from "./image-asset.schema";
import { ImageOptimizer } from "./image-optimizer.service";
export declare class UploadsService {
    private readonly config;
    private readonly assets;
    private readonly optimizer;
    private readonly s3;
    constructor(config: ConfigService, assets: Model<ImageAsset>, optimizer: ImageOptimizer);
    private url;
    private result;
    uploadImage(owner: string, input: Buffer): Promise<{
        imageKey: string;
        imageUrl: string;
        variants: {
            url: string;
            key: string;
            width: number;
            height: number;
            bytes: number;
            contentType: "image/webp";
        }[];
        sourceBytes: number;
        totalBytes: number;
    }>;
    requireImage(imageKey: string, owner: string): Promise<{
        imageKey: string;
        imageUrl: string;
        variants: {
            url: string;
            key: string;
            width: number;
            height: number;
            bytes: number;
            contentType: "image/webp";
        }[];
        sourceBytes: number;
        totalBytes: number;
    }>;
}
