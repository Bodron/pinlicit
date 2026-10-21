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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const auctions_gateway_1 = require("../auctions/auctions.gateway");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_user_decorator_1 = require("../common/current-user.decorator");
const bids_service_1 = require("../bids/bids.service");
const place_bid_dto_1 = require("../bids/dto/place-bid.dto");
const create_product_dto_1 = require("./dto/create-product.dto");
const feed_query_dto_1 = require("./dto/feed-query.dto");
const products_service_1 = require("./products.service");
let ProductsController = class ProductsController {
    constructor(productsService, bidsService, auctionsGateway) {
        this.productsService = productsService;
        this.bidsService = bidsService;
        this.auctionsGateway = auctionsGateway;
    }
    create(user, dto) {
        return this.productsService.create(user, dto);
    }
    feed(query) {
        return this.productsService.feed(query);
    }
    find(id) {
        return this.productsService.findPublic(id);
    }
    placeBid(id, user, dto) {
        return this.bidsService.placeBid(id, user._id.toString(), dto.amount);
    }
    async buyNow(id, user) {
        const product = await this.productsService.reserveByBuyNow(id, user._id.toString());
        this.auctionsGateway.broadcastClosed(product);
        return product;
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_product_dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("feed"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [feed_query_dto_1.FeedQueryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "feed", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "find", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(":id/bids"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, place_bid_dto_1.PlaceBidDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "placeBid", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(":id/buy-now"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "buyNow", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)("products"),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        bids_service_1.BidsService,
        auctions_gateway_1.AuctionsGateway])
], ProductsController);
//# sourceMappingURL=products.controller.js.map