import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ProductDocument = HydratedDocument<Product>;

export enum ProductStatus {
  Active = "active",
  Reserved = "reserved",
  Sold = "sold",
  Hidden = "hidden",
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  seller: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reservedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  category: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true })
  videoKey: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop({ enum: ProductStatus, default: ProductStatus.Active })
  status: ProductStatus;

  @Prop({ required: true, min: 0 })
  startingPrice: number;

  @Prop({ min: 0 })
  reservePrice?: number;

  @Prop({ required: true, min: 0 })
  currentPrice: number;

  @Prop({ required: true, min: 1 })
  minBidIncrement: number;

  @Prop({ required: true, min: 1 })
  buyNowPrice: number;

  @Prop({ default: 0, min: 0 })
  favoriteCount: number;

  @Prop({ required: true })
  startsAt: Date;

  @Prop({ required: true })
  endsAt: Date;

  @Prop({ type: Types.ObjectId, ref: "Bid" })
  highestBid?: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ status: 1, endsAt: 1, createdAt: -1 });
ProductSchema.index({ category: 1, status: 1, endsAt: 1 });
