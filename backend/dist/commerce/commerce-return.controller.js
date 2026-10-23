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
exports.CommerceReturnController = void 0;
const common_1 = require("@nestjs/common");
let CommerceReturnController = class CommerceReturnController {
    returned() {
        return '<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pinbind — Stripe</title><body><h1>Poți reveni în aplicație</h1><p>Starea verificării și a contului va fi actualizată după confirmarea Stripe. Revenirea pe această pagină nu confirmă finalizarea.</p></body></html>';
    }
    refresh() {
        return '<!doctype html><html lang="ro"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pinbind — Link expirat</title><body><h1>Solicită un link nou</h1><p>Linkul de configurare Stripe a expirat sau a fost folosit. Revino în aplicație și pornește din nou configurarea încasărilor.</p></body></html>';
    }
};
exports.CommerceReturnController = CommerceReturnController;
__decorate([
    (0, common_1.Get)("return"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    (0, common_1.Header)("Cache-Control", "no-store"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceReturnController.prototype, "returned", null);
__decorate([
    (0, common_1.Get)("refresh"),
    (0, common_1.Header)("Content-Type", "text/html; charset=utf-8"),
    (0, common_1.Header)("Cache-Control", "no-store"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceReturnController.prototype, "refresh", null);
exports.CommerceReturnController = CommerceReturnController = __decorate([
    (0, common_1.Controller)("commerce/stripe")
], CommerceReturnController);
//# sourceMappingURL=commerce-return.controller.js.map