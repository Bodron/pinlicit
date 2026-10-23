"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const environment_1 = require("./config/environment");
const commerce_module_1 = require("./commerce/commerce.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const admin_module_1 = require("./admin/admin.module");
const auctions_module_1 = require("./auctions/auctions.module");
const auth_module_1 = require("./auth/auth.module");
const bids_module_1 = require("./bids/bids.module");
const categories_module_1 = require("./categories/categories.module");
const favorites_module_1 = require("./favorites/favorites.module");
const products_module_1 = require("./products/products.module");
const seller_applications_module_1 = require("./seller-applications/seller-applications.module");
const uploads_module_1 = require("./uploads/uploads.module");
const users_module_1 = require("./users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, validate: environment_1.validateEnvironment }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.get("MONGODB_URI") ||
                        "mongodb://localhost:27017/licit",
                }),
            }),
            commerce_module_1.CommerceModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            categories_module_1.CategoriesModule,
            seller_applications_module_1.SellerApplicationsModule,
            products_module_1.ProductsModule,
            bids_module_1.BidsModule,
            favorites_module_1.FavoritesModule,
            auctions_module_1.AuctionsModule,
            uploads_module_1.UploadsModule,
            admin_module_1.AdminModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map