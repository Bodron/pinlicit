import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SellerApplicationDocument = HydratedDocument<SellerApplication>;

export enum SellerApplicationStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

@Schema({ timestamps: true })
export class SellerApplication {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ required: true, trim: true })
  contactPhone: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({
    enum: SellerApplicationStatus,
    default: SellerApplicationStatus.Pending,
  })
  status: SellerApplicationStatus;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;
}

export const SellerApplicationSchema =
  SchemaFactory.createForClass(SellerApplication);
SellerApplicationSchema.index({ user: 1, status: 1 });
