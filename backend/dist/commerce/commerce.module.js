"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const product_schema_1 = require("../products/schemas/product.schema");
const bid_schema_1 = require("../bids/schemas/bid.schema");
const commerce_schemas_1 = require("./commerce.schemas");
const stripe_client_service_1 = require("./stripe-client.service");
const commerce_lock_service_1 = require("./commerce-lock.service");
const commerce_accounts_service_1 = require("./commerce-accounts.service");
const commerce_orders_service_1 = require("./commerce-orders.service");
const commerce_controller_1 = require("./commerce.controller");
const commerce_worker_1 = require("./commerce.worker");
let CommerceModule = class CommerceModule {
};
exports.CommerceModule = CommerceModule;
exports.CommerceModule = CommerceModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema },
                { name: bid_schema_1.Bid.name, schema: bid_schema_1.BidSchema },
                { name: commerce_schemas_1.CommerceAccount.name, schema: commerce_schemas_1.CommerceAccountSchema },
                { name: commerce_schemas_1.CommerceOrder.name, schema: commerce_schemas_1.CommerceOrderSchema },
                { name: commerce_schemas_1.StripeInbox.name, schema: commerce_schemas_1.StripeInboxSchema },
                { name: commerce_schemas_1.CommerceLock.name, schema: commerce_schemas_1.CommerceLockSchema },
            ]),
        ],
        providers: [
            stripe_client_service_1.StripeClientService,
            commerce_lock_service_1.CommerceLockService,
            commerce_accounts_service_1.CommerceAccountsService,
            commerce_orders_service_1.CommerceOrdersService,
            commerce_worker_1.CommerceWorker,
            commerce_controller_1.StripeHttpFilter,
        ],
        controllers: [commerce_controller_1.CommerceController, commerce_controller_1.CommerceWebhooksController],
        exports: [
            commerce_accounts_service_1.CommerceAccountsService,
            commerce_orders_service_1.CommerceOrdersService,
            stripe_client_service_1.StripeClientService,
        ],
    })
], CommerceModule);
//# sourceMappingURL=commerce.module.js.map