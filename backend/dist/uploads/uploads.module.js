"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const uploads_controller_1 = require("./uploads.controller");
const uploads_service_1 = require("./uploads.service");
const image_asset_schema_1 = require("./image-asset.schema");
const image_optimizer_service_1 = require("./image-optimizer.service");
const image_capacity_interceptor_1 = require("./image-capacity.interceptor");
let UploadsModule = class UploadsModule {
};
exports.UploadsModule = UploadsModule;
exports.UploadsModule = UploadsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: image_asset_schema_1.ImageAsset.name, schema: image_asset_schema_1.ImageAssetSchema },
            ]),
        ],
        controllers: [uploads_controller_1.UploadsController],
        providers: [uploads_service_1.UploadsService, image_optimizer_service_1.ImageOptimizer, image_capacity_interceptor_1.ImageCapacityInterceptor],
        exports: [uploads_service_1.UploadsService],
    })
], UploadsModule);
//# sourceMappingURL=uploads.module.js.map