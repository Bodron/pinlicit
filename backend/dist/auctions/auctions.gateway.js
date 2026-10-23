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
exports.AuctionsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const bids_service_1 = require("../bids/bids.service");
const products_service_1 = require("../products/products.service");
let AuctionsGateway = class AuctionsGateway {
    constructor(productsService, bidsService) {
        this.productsService = productsService;
        this.bidsService = bidsService;
    }
    handleConnection(client) {
        client.emit("connected", { ok: true });
    }
    async join(client, body) {
        const product = await this.productsService.findPublic(body.productId);
        const bids = await this.bidsService.latestForProduct(body.productId);
        await client.join(this.room(body.productId));
        client.emit("auction:update", { product, bids });
    }
    async leave(client, body) {
        await client.leave(this.room(body.productId));
    }
    place(client) {
        client.emit("bid:rejected", {
            message: "Use the authenticated HTTP bidding endpoint.",
        });
    }
    broadcastBid(product, bid, extended) {
        const publicBid = {
            _id: bid._id,
            amount: bid.amount,
            createdAt: bid.createdAt,
            bidder: { _id: bid.bidder?._id, name: bid.bidder?.name },
        };
        const payload = { product, bid: publicBid };
        this.server.to(this.room(product._id.toString())).emit("bid:new", payload);
        this.server.to(this.room(product._id.toString())).emit("auction:update", {
            product,
            bids: [publicBid],
        });
        if (extended) {
            this.server
                .to(this.room(product._id.toString()))
                .emit("auction:extended", {
                productId: product._id.toString(),
                endsAt: product.endsAt,
            });
        }
    }
    broadcastClosed(product) {
        this.server
            .to(this.room(product._id.toString()))
            .emit("auction:closed", { product });
    }
    room(productId) {
        return `auction:${productId}`;
    }
};
exports.AuctionsGateway = AuctionsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AuctionsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("auction:join"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AuctionsGateway.prototype, "join", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("auction:leave"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AuctionsGateway.prototype, "leave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("bid:place"),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], AuctionsGateway.prototype, "place", null);
exports.AuctionsGateway = AuctionsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: true, credentials: true } }),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => bids_service_1.BidsService))),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        bids_service_1.BidsService])
], AuctionsGateway);
//# sourceMappingURL=auctions.gateway.js.map