"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auctions_module_1 = require("../auctions/auctions.module");
const products_module_1 = require("../products/products.module");
const bid_schema_1 = require("./schemas/bid.schema");
const bids_controller_1 = require("./bids.controller");
const bids_service_1 = require("./bids.service");
let BidsModule = class BidsModule {
};
exports.BidsModule = BidsModule;
exports.BidsModule = BidsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => products_module_1.ProductsModule),
            (0, common_1.forwardRef)(() => auctions_module_1.AuctionsModule),
            mongoose_1.MongooseModule.forFeature([{ name: bid_schema_1.Bid.name, schema: bid_schema_1.BidSchema }]),
        ],
        controllers: [bids_controller_1.BidsController],
        providers: [bids_service_1.BidsService],
        exports: [bids_service_1.BidsService, mongoose_1.MongooseModule],
    })
], BidsModule);
//# sourceMappingURL=bids.module.js.map