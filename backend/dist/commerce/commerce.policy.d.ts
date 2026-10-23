export declare function priceSnapshot(amount: number, feeBps: number): {
    amount: number;
    fee: number;
    sellerAmount: number;
    currency: string;
    feeBps: number;
};
export declare function assertBuyer(order: {
    buyer: unknown;
}, userId: string): void;
export declare function publicOrder(order: any): {
    id: string;
    productId: string;
    title: any;
    buyerId: string;
    sellerId: string;
    amount: any;
    depositCredit: any;
    amountDue: number;
    fee: any;
    sellerAmount: any;
    payoutSetupRequired: boolean;
    fundsReviewAt: any;
    currency: any;
    status: any;
    paymentDeadline: any;
    carrier: any;
    trackingCode: any;
    deliveredAt: any;
    releaseAfter: any;
    issueOpen: any;
    refundedAmount: any;
};
