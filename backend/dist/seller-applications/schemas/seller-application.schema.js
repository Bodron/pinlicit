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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellerApplicationSchema = exports.SellerApplication = exports.SellerApplicationStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var SellerApplicationStatus;
(function (SellerApplicationStatus) {
    SellerApplicationStatus["Pending"] = "pending";
    SellerApplicationStatus["Approved"] = "approved";
    SellerApplicationStatus["Rejected"] = "rejected";
})(SellerApplicationStatus || (exports.SellerApplicationStatus = SellerApplicationStatus = {}));
let SellerApplication = class SellerApplication {
};
exports.SellerApplication = SellerApplication;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SellerApplication.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SellerApplication.prototype, "displayName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], SellerApplication.prototype, "contactPhone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], SellerApplication.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        enum: SellerApplicationStatus,
        default: SellerApplicationStatus.Pending,
    }),
    __metadata("design:type", String)
], SellerApplication.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SellerApplication.prototype, "reviewedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], SellerApplication.prototype, "reviewedAt", void 0);
exports.SellerApplication = SellerApplication = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SellerApplication);
exports.SellerApplicationSchema = mongoose_1.SchemaFactory.createForClass(SellerApplication);
exports.SellerApplicationSchema.index({ user: 1, status: 1 });
//# sourceMappingURL=seller-application.schema.js.map