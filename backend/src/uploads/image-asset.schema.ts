import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ImageVariant } from "./image-policy";

@Schema({ timestamps: true, versionKey: false })
export class ImageAsset {
  @Prop({ type: String }) _id: string;
  @Prop({ required: true, index: true }) owner: string;
  @Prop({ required: true }) status: string;
  @Prop({ required: true }) processingStartedAt: Date;
  @Prop() lease: string;
  @Prop() sourceBytes: number;
  @Prop() lastReferencedAt?: Date;
  @Prop() totalBytes: number;
  @Prop() imageKey: string;
  @Prop({ type: [Object], default: [] }) variants: ImageVariant[];
}
export const ImageAssetSchema = SchemaFactory.createForClass(ImageAsset);
ImageAssetSchema.index({ status: 1, processingStartedAt: 1 });
