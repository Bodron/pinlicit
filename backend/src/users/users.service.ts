import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument, UserRole } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
  }) {
    const existing = await this.userModel.exists({
      email: input.email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException("Email is already registered.");
    }
    return this.userModel.create({
      ...input,
      email: input.email.toLowerCase(),
      role: UserRole.User,
    });
  }

  findByEmailWithPassword(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select("+passwordHash");
  }

  findById(id: string | Types.ObjectId) {
    return this.userModel.findById(id);
  }

  async requireById(id: string | Types.ObjectId) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }

  async promoteToSeller(userId: string | Types.ObjectId) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { role: UserRole.Seller },
      { new: true },
    );
  }

  async blockUser(userId: string, blocked = true) {
    return this.userModel.findByIdAndUpdate(userId, { blocked }, { new: true });
  }

  toPublicUser(user: UserDocument | any) {
    return {
      id: user._id?.toString?.() ?? user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      blocked: user.blocked,
      phone: user.phone,
    };
  }
}
