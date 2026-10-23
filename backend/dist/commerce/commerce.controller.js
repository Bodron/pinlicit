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
exports.CommerceWebhooksController = exports.CommerceController = exports.CommercePrivateHeaders = exports.CommerceIdPipe = exports.StripeHttpFilter = void 0;
const common_1 = require("@nestjs/common");
const Stripe = require("stripe");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const roles_decorator_1 = require("../common/roles.decorator");
const roles_guard_1 = require("../common/roles.guard");
const user_schema_1 = require("../users/schemas/user.schema");
const commerce_accounts_service_1 = require("./commerce-accounts.service");
const commerce_orders_service_1 = require("./commerce-orders.service");
const commerce_worker_1 = require("./commerce.worker");
const commerce_dto_1 = require("./commerce.dto");
const stripe_client_service_1 = require("./stripe-client.service");
let StripeHttpFilter = class StripeHttpFilter {
    catch(_, host) {
        host
            .switchToHttp()
            .getResponse()
            .setHeader("Cache-Control", "private, no-store");
        host.switchToHttp().getResponse().status(503).json({
            statusCode: 503,
            message: "Payment provider is unavailable. Retry shortly.",
        });
    }
};
exports.StripeHttpFilter = StripeHttpFilter;
exports.StripeHttpFilter = StripeHttpFilter = __decorate([
    (0, common_1.Catch)(Stripe.errors.StripeError)
], StripeHttpFilter);
const common_2 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
let CommerceIdPipe = class CommerceIdPipe {
    transform(value) {
        if (!/^[a-f\d]{24}$/i.test(value) || !mongoose_1.Types.ObjectId.isValid(value))
            throw new common_2.BadRequestException("Invalid identifier.");
        return value;
    }
};
exports.CommerceIdPipe = CommerceIdPipe;
exports.CommerceIdPipe = CommerceIdPipe = __decorate([
    (0, common_2.Injectable)()
], CommerceIdPipe);
let CommercePrivateHeaders = class CommercePrivateHeaders {
    intercept(context, next) {
        context
            .switchToHttp()
            .getResponse()
            .setHeader("Cache-Control", "private, no-store");
        return next.handle();
    }
};
exports.CommercePrivateHeaders = CommercePrivateHeaders;
exports.CommercePrivateHeaders = CommercePrivateHeaders = __decorate([
    (0, common_2.Injectable)()
], CommercePrivateHeaders);
let CommerceController = class CommerceController {
    constructor(accounts, orders) {
        this.accounts = accounts;
        this.orders = orders;
    }
    status(user) {
        return this.accounts.status(String(user._id));
    }
    identity(user) {
        return this.accounts.startIdentity(String(user._id));
    }
    connect(user) {
        return this.accounts.startConnect(user);
    }
    reviewQueue() {
        return this.orders.reviewQueue();
    }
    mine(user) {
        return this.orders.mine(String(user._id));
    }
    create(id, user) {
        return this.orders.create(id, String(user._id));
    }
    payment(id, user) {
        return this.orders.payment(id, String(user._id));
    }
    shipment(id, user, dto) {
        return this.orders.shipped(id, String(user._id), dto.carrier, dto.trackingCode);
    }
    receipt(id, user) {
        return this.orders.delivered(id, String(user._id));
    }
    issue(id, user, dto) {
        return this.orders.issue(id, String(user._id), dto.code);
    }
    refund(id, user, dto) {
        return this.orders.refund(id, dto.reason, String(user._id));
    }
};
exports.CommerceController = CommerceController;
__decorate([
    (0, common_1.Get)("me"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "status", null);
__decorate([
    (0, common_1.Post)("identity/session"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "identity", null);
__decorate([
    (0, common_1.Post)("seller/onboarding"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "connect", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.Admin),
    (0, common_1.Get)("review-queue"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "reviewQueue", null);
__decorate([
    (0, common_1.Get)("orders"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)("products/:id/order"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "create", null);
__decorate([
    (0, common_1.Post)("orders/:id/payment"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "payment", null);
__decorate([
    (0, common_1.Post)("orders/:id/shipment"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, commerce_dto_1.ShipmentDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "shipment", null);
__decorate([
    (0, common_1.Post)("orders/:id/receipt"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "receipt", null);
__decorate([
    (0, common_1.Post)("orders/:id/issues"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, commerce_dto_1.OrderIssueDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "issue", null);
__decorate([
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_schema_1.UserRole.Admin),
    (0, common_1.Post)("orders/:id/refund"),
    __param(0, (0, common_1.Param)("id", CommerceIdPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, commerce_dto_1.OrderRefundDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "refund", null);
exports.CommerceController = CommerceController = __decorate([
    (0, common_1.UseInterceptors)(CommercePrivateHeaders),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseFilters)(StripeHttpFilter),
    (0, common_1.Controller)("commerce"),
    __metadata("design:paramtypes", [commerce_accounts_service_1.CommerceAccountsService,
        commerce_orders_service_1.CommerceOrdersService])
], CommerceController);
let CommerceWebhooksController = class CommerceWebhooksController {
    constructor(stripe, worker) {
        this.stripe = stripe;
        this.worker = worker;
    }
    receive(request, signature) {
        return this.worker.enqueue(this.stripe.event(request.rawBody, signature));
    }
    receiveConnect(request, signature) {
        return this.worker.enqueue(this.stripe.event(request.rawBody, signature, true));
    }
};
exports.CommerceWebhooksController = CommerceWebhooksController;
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)("stripe"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)("stripe-signature")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommerceWebhooksController.prototype, "receive", null);
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)("connect"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)("stripe-signature")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommerceWebhooksController.prototype, "receiveConnect", null);
exports.CommerceWebhooksController = CommerceWebhooksController = __decorate([
    (0, common_1.UseFilters)(StripeHttpFilter),
    (0, common_1.Controller)("commerce/webhooks"),
    __metadata("design:paramtypes", [stripe_client_service_1.StripeClientService,
        commerce_worker_1.CommerceWorker])
], CommerceWebhooksController);
//# sourceMappingURL=commerce.controller.js.map