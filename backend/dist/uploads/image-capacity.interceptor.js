"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageCapacityInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let ImageCapacityInterceptor = class ImageCapacityInterceptor {
    constructor() {
        this.active = 0;
    }
    intercept(_context, next) {
        if (this.active >= 2)
            throw new common_1.ServiceUnavailableException("Image processing is busy. Retry shortly.");
        this.active++;
        try {
            return next.handle().pipe((0, rxjs_1.finalize)(() => this.active--));
        }
        catch (error) {
            this.active--;
            throw error;
        }
    }
};
exports.ImageCapacityInterceptor = ImageCapacityInterceptor;
exports.ImageCapacityInterceptor = ImageCapacityInterceptor = __decorate([
    (0, common_1.Injectable)()
], ImageCapacityInterceptor);
//# sourceMappingURL=image-capacity.interceptor.js.map