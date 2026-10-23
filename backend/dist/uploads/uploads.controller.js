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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const roles_guard_1 = require("../common/roles.guard");
const user_schema_1 = require("../users/schemas/user.schema");
const image_policy_1 = require("./image-policy");
const image_capacity_interceptor_1 = require("./image-capacity.interceptor");
const uploads_service_1 = require("./uploads.service");
let UploadsController = class UploadsController {
    constructor(uploadsService) {
        this.uploadsService = uploadsService;
    }
    upload(user, image) {
        if (!image?.buffer?.length)
            throw new common_1.BadRequestException("An image is required.");
        return this.uploadsService.uploadImage(String(user._id), image.buffer);
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)("images"),
    (0, common_1.UseInterceptors)(image_capacity_interceptor_1.ImageCapacityInterceptor, (0, platform_express_1.FileInterceptor)("image", {
        limits: { fileSize: image_policy_1.MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 2 },
        fileFilter: (_request, file, callback) => callback(["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
            ? null
            : new common_1.BadRequestException("Use JPG, PNG or WebP."), true),
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], UploadsController.prototype, "upload", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.Seller, user_schema_1.UserRole.Admin),
    (0, common_1.Controller)("uploads"),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map