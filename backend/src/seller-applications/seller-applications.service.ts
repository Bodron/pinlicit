import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UsersService } from "../users/users.service";
import { CreateSellerApplicationDto } from "./dto/create-seller-application.dto";
import {
  SellerApplication,
  SellerApplicationDocument,
  SellerApplicationStatus,
} from "./schemas/seller-application.schema";

@Injectable()
export class SellerApplicationsService {
  constructor(
    @InjectModel(SellerApplication.name)
    private readonly applicationModel: Model<SellerApplicationDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateSellerApplicationDto) {
    const pending = await this.applicationModel.exists({
      user: userId,
      status: SellerApplicationStatus.Pending,
    });
    if (pending) {
      throw new BadRequestException(
        "You already have a pending seller application.",
      );
    }
    return this.applicationModel.create({
      ...dto,
      user: new Types.ObjectId(userId),
    });
  }

  findMine(userId: string) {
    return this.applicationModel.find({ user: userId }).sort({ createdAt: -1 });
  }

  listPending() {
    return this.applicationModel
      .find({ status: SellerApplicationStatus.Pending })
      .populate("user", "name email phone role")
      .sort({ createdAt: 1 });
  }

  async approve(applicationId: string, adminId: string) {
    const app = await this.applicationModel.findById(applicationId);
    if (!app) {
      throw new NotFoundException("Seller application not found.");
    }
    app.status = SellerApplicationStatus.Approved;
    app.reviewedBy = new Types.ObjectId(adminId);
    app.reviewedAt = new Date();
    await app.save();
    await this.usersService.promoteToSeller(app.user);
    return app;
  }

  async reject(applicationId: string, adminId: string) {
    const app = await this.applicationModel.findById(applicationId);
    if (!app) {
      throw new NotFoundException("Seller application not found.");
    }
    app.status = SellerApplicationStatus.Rejected;
    app.reviewedBy = new Types.ObjectId(adminId);
    app.reviewedAt = new Date();
    return app.save();
  }
}
