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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(input) {
        const existing = await this.userModel.exists({
            email: input.email.toLowerCase(),
        });
        if (existing) {
            throw new common_1.ConflictException("Email is already registered.");
        }
        return this.userModel.create({
            ...input,
            email: input.email.toLowerCase(),
            role: user_schema_1.UserRole.User,
        });
    }
    findByEmailWithPassword(email) {
        return this.userModel
            .findOne({ email: email.toLowerCase() })
            .select("+passwordHash");
    }
    findById(id) {
        return this.userModel.findById(id);
    }
    async requireById(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException("User not found.");
        }
        return user;
    }
    async promoteToSeller(userId) {
        return this.userModel.findByIdAndUpdate(userId, { role: user_schema_1.UserRole.Seller }, { new: true });
    }
    async blockUser(userId, blocked = true) {
        return this.userModel.findByIdAndUpdate(userId, { blocked }, { new: true });
    }
    toPublicUser(user) {
        return {
            id: user._id?.toString?.() ?? user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            blocked: user.blocked,
            phone: user.phone,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map