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
exports.BidGuaranteeDto = exports.OrderRefundDto = exports.OrderIssueDto = exports.ShipmentDto = void 0;
const class_validator_1 = require("class-validator");
class ShipmentDto {
}
exports.ShipmentDto = ShipmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", String)
], ShipmentDto.prototype, "carrier", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ShipmentDto.prototype, "trackingCode", void 0);
class OrderIssueDto {
}
exports.OrderIssueDto = OrderIssueDto;
__decorate([
    (0, class_validator_1.IsIn)(["not_received", "not_as_described", "damaged", "other"]),
    __metadata("design:type", String)
], OrderIssueDto.prototype, "code", void 0);
class OrderRefundDto {
}
exports.OrderRefundDto = OrderRefundDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], OrderRefundDto.prototype, "reason", void 0);
class BidGuaranteeDto {
}
exports.BidGuaranteeDto = BidGuaranteeDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(3000),
    (0, class_validator_1.Max)(99999999),
    __metadata("design:type", Number)
], BidGuaranteeDto.prototype, "maximum", void 0);
//# sourceMappingURL=commerce.dto.js.map