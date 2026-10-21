import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  User = "user",
  Seller = "seller",
  Admin = "admin",
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ enum: UserRole, default: UserRole.User })
  role: UserRole;

  @Prop({ default: false })
  blocked: boolean;

  @Prop({ trim: true })
  phone?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
