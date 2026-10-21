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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const roles_guard_1 = require("../common/roles.guard");
const products_service_1 = require("../products/products.service");
const seller_applications_service_1 = require("../seller-applications/seller-applications.service");
const user_schema_1 = require("../users/schemas/user.schema");
const users_service_1 = require("../users/users.service");
let AdminController = class AdminController {
    constructor(applicationsService, productsService, usersService) {
        this.applicationsService = applicationsService;
        this.productsService = productsService;
        this.usersService = usersService;
    }
    sellerApplications() {
        return this.applicationsService.listPending();
    }
    approveSeller(id, admin) {
        return this.applicationsService.approve(id, admin._id.toString());
    }
    rejectSeller(id, admin) {
        return this.applicationsService.reject(id, admin._id.toString());
    }
    hideProduct(id) {
        return this.productsService.hide(id);
    }
    blockUser(id, blocked = true) {
        return this.usersService.blockUser(id, blocked);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)("seller-applications"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "sellerApplications", null);
__decorate([
    (0, common_1.Post)("seller-applications/:id/approve"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveSeller", null);
__decorate([
    (0, common_1.Post)("seller-applications/:id/reject"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectSeller", null);
__decorate([
    (0, common_1.Post)("products/:id/hide"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "hideProduct", null);
__decorate([
    (0, common_1.Patch)("users/:id/block"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("blocked")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "blockUser", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.Admin),
    (0, common_1.Controller)("admin"),
    __metadata("design:paramtypes", [seller_applications_service_1.SellerApplicationsService,
        products_service_1.ProductsService,
        users_service_1.UsersService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map