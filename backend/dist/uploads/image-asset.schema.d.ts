import { ImageVariant } from "./image-policy";
export declare class ImageAsset {
    _id: string;
    owner: string;
    status: string;
    processingStartedAt: Date;
    lease: string;
    sourceBytes: number;
    lastReferencedAt?: Date;
    totalBytes: number;
    imageKey: string;
    variants: ImageVariant[];
}
export declare const ImageAssetSchema: import("mongoose").Schema<ImageAsset, import("mongoose").Model<ImageAsset, any, any, any, import("mongoose").Document<unknown, any, ImageAsset, any, {}> & ImageAsset & Required<{
    _id: string;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ImageAsset, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<ImageAsset>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ImageAsset> & Required<{
    _id: string;
}> & {
    __v: number;
}>;
