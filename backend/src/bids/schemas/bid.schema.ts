import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type BidDocument = HydratedDocument<Bid>;

@Schema({ timestamps: true })
export class Bid {
  @Prop({ type: Types.ObjectId, ref: "Product", required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  bidder: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  maxAmount: number;

  @Prop({ required: true, min: 1 })
  amount: number;
}

export const BidSchema = SchemaFactory.createForClass(Bid);
BidSchema.index({ product: 1, maxAmount: -1, createdAt: 1 });
BidSchema.index({ product: 1, amount: -1, createdAt: -1 });
BidSchema.index({ bidder: 1, createdAt: -1 });
