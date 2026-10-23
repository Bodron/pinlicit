import { BadRequestException, ForbiddenException } from "@nestjs/common";
export function priceSnapshot(amount: number, feeBps: number) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 99999999 ||
    !Number.isSafeInteger(feeBps) ||
    feeBps < 0 ||
    feeBps > 5000
  ) {
    throw new BadRequestException("Invalid payment amount or platform fee.");
  }
  const fee = Math.floor((amount * feeBps) / 10000);
  return { amount, fee, sellerAmount: amount - fee, currency: "ron", feeBps };
}
export function assertBuyer(order: { buyer: unknown }, userId: string) {
  if (String(order.buyer) !== userId)
    throw new ForbiddenException("This order belongs to another buyer.");
}
export function publicOrder(order: any) {
  return {
    id: String(order._id),
    productId: String(order.product),
    title: order.title,
    buyerId: String(order.buyer),
    sellerId: String(order.seller),
    amount: order.amount,
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
