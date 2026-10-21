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
exports.SellerApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const seller_application_schema_1 = require("./schemas/seller-application.schema");
let SellerApplicationsService = class SellerApplicationsService {
    constructor(applicationModel, usersService) {
        this.applicationModel = applicationModel;
        this.usersService = usersService;
    }
    async create(userId, dto) {
        const pending = await this.applicationModel.exists({
            user: userId,
            status: seller_application_schema_1.SellerApplicationStatus.Pending,
        });
        if (pending) {
            throw new common_1.BadRequestException("You already have a pending seller application.");
        }
        return this.applicationModel.create({
            ...dto,
            user: new mongoose_2.Types.ObjectId(userId),
        });
    }
    findMine(userId) {
        return this.applicationModel.find({ user: userId }).sort({ createdAt: -1 });
    }
    listPending() {
        return this.applicationModel
            .find({ status: seller_application_schema_1.SellerApplicationStatus.Pending })
            .populate("user", "name email phone role")
            .sort({ createdAt: 1 });
    }
    async approve(applicationId, adminId) {
        const app = await this.applicationModel.findById(applicationId);
        if (!app) {
            throw new common_1.NotFoundException("Seller application not found.");
        }
        app.status = seller_application_schema_1.SellerApplicationStatus.Approved;
        app.reviewedBy = new mongoose_2.Types.ObjectId(adminId);
        app.reviewedAt = new Date();
        await app.save();
        await this.usersService.promoteToSeller(app.user);
        return app;
    }
    async reject(applicationId, adminId) {
        const app = await this.applicationModel.findById(applicationId);
        if (!app) {
            throw new common_1.NotFoundException("Seller application not found.");
        }
        app.status = seller_application_schema_1.SellerApplicationStatus.Rejected;
        app.reviewedBy = new mongoose_2.Types.ObjectId(adminId);
        app.reviewedAt = new Date();
        return app.save();
    }
};
exports.SellerApplicationsService = SellerApplicationsService;
exports.SellerApplicationsService = SellerApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(seller_application_schema_1.SellerApplication.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService])
], SellerApplicationsService);
//# sourceMappingURL=seller-applications.service.js.map