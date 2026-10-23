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
exports.CommerceLockService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
const mongoose_2 = require("mongoose");
const commerce_schemas_1 = require("./commerce.schemas");
let CommerceLockService = class CommerceLockService {
    constructor(locks) {
        this.locks = locks;
    }
    async ready() {
        await this.locks.init();
    }
    async run(key, action) {
        const owner = (0, crypto_1.randomUUID)();
        try {
            await this.locks.findOneAndUpdate({ key, expiresAt: { $lte: new Date() } }, {
                $set: { owner, expiresAt: new Date(Date.now() + 120000) },
                $setOnInsert: { key },
            }, { upsert: true, new: true });
        }
        catch (error) {
            if (error.code === 11000)
                throw new common_1.ConflictException("Operation is already in progress. Retry shortly.");
            throw error;
        }
        let lost = false;
        let renewing = Promise.resolve();
        const heartbeat = setInterval(() => {
            renewing = renewing
                .then(async () => {
                const result = await this.locks.updateOne({ key, owner, expiresAt: { $gt: new Date() } }, { $set: { expiresAt: new Date(Date.now() + 120000) } });
                if (result.matchedCount !== 1)
                    lost = true;
            })
                .catch(() => {
                lost = true;
            });
        }, 30000);
        heartbeat.unref();
        try {
            const result = await action();
            if (lost)
                throw new common_1.ConflictException("Operation lease was lost. Reconciliation is required.");
            return result;
        }
        finally {
            clearInterval(heartbeat);
            await renewing;
            await this.locks.deleteOne({ key, owner });
        }
    }
};
exports.CommerceLockService = CommerceLockService;
exports.CommerceLockService = CommerceLockService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(commerce_schemas_1.CommerceLock.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CommerceLockService);
//# sourceMappingURL=commerce-lock.service.js.map