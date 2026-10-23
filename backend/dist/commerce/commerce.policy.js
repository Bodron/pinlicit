"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceSnapshot = priceSnapshot;
exports.assertBuyer = assertBuyer;
exports.publicOrder = publicOrder;
const common_1 = require("@nestjs/common");
function priceSnapshot(amount, feeBps) {
    if (!Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 99999999 ||
        !Number.isSafeInteger(feeBps) ||
        feeBps < 0 ||
        feeBps > 5000) {
        throw new common_1.BadRequestException("Invalid payment amount or platform fee.");
    }
    const fee = Math.floor((amount * feeBps) / 10000);
    return { amount, fee, sellerAmount: amount - fee, currency: "ron", feeBps };
}
function assertBuyer(order, userId) {
    if (String(order.buyer) !== userId)
        throw new common_1.ForbiddenException("This order belongs to another buyer.");
}
function publicOrder(order) {
    return {
        id: String(order._id),
        productId: String(order.product),
        title: order.title,
        buyerId: String(order.buyer),
        sellerId: String(order.seller),
        amount: order.amount,
        depositCredit: order.depositCredit || 0,
        amountDue: order.amount - (order.depositCredit || 0),
        fee: order.fee,
        sellerAmount: order.sellerAmount,
        currency: order.currency,
        status: order.status,
        paymentDeadline: order.paymentDeadline,
        carrier: order.carrier,
        trackingCode: order.trackingCode,
        deliveredAt: order.deliveredAt,
        releaseAfter: order.releaseAfter,
        issueOpen: order.issueOpen,
        refundedAmount: order.refundedAmount,
    };
}
//# sourceMappingURL=commerce.policy.js.map