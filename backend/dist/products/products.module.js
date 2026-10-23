"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const uploads_module_1 = require("../uploads/uploads.module");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auctions_module_1 = require("../auctions/auctions.module");
const bids_module_1 = require("../bids/bids.module");
const categories_module_1 = require("../categories/categories.module");
const users_module_1 = require("../users/users.module");
const product_schema_1 = require("./schemas/product.schema");
const my_products_controller_1 = require("./my-products.controller");
const products_controller_1 = require("./products.controller");
const products_service_1 = require("./products.service");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            uploads_module_1.UploadsModule,
            categories_module_1.CategoriesModule,
            (0, common_1.forwardRef)(() => auctions_module_1.AuctionsModule),
            (0, common_1.forwardRef)(() => bids_module_1.BidsModule),
            mongoose_1.MongooseModule.forFeature([{ name: product_schema_1.Product.name, schema: product_schema_1.ProductSchema }]),
        ],
        controllers: [products_controller_1.ProductsController, my_products_controller_1.MyProductsController],
        providers: [products_service_1.ProductsService],
        exports: [products_service_1.ProductsService, mongoose_1.MongooseModule],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map