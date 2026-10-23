import { BidDepositsService } from "./bid-deposits.service";
import { ArgumentsHost, ExceptionFilter, RawBodyRequest, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Request } from "express";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceOrdersService } from "./commerce-orders.service";
import { CommerceWorker } from "./commerce.worker";
import { BidGuaranteeDto, OrderIssueDto, OrderRefundDto, ShipmentDto } from "./commerce.dto";
import { StripeClientService } from "./stripe-client.service";
export declare class StripeHttpFilter implements ExceptionFilter {
    catch(_: unknown, host: ArgumentsHost): void;
}
import { PipeTransform } from "@nestjs/common";
export declare class CommerceIdPipe implements PipeTransform {
    transform(value: string): string;
}
export declare class CommercePrivateHeaders implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}
export declare class CommerceController {
    private readonly accounts;
    private readonly orders;
    private readonly stripe;
    private readonly deposits;
    constructor(accounts: CommerceAccountsService, orders: CommerceOrdersService, stripe: StripeClientService, deposits: BidDepositsService);
    config(): {
        enabled: boolean;
        ready: boolean;
        mode: string;
        publishableKey: string;
        merchantDisplayName: string;
        guaranteeBps: number;
        minimumGuaranteePayment: number;
        minimumBidMaximum: number;
    };
    depositsMine(user: any): Promise<{
        id: string;
        productId: string;
        amount: number;
        maximum: number;
        status: string;
        credited: number;
        refunded: number;
    }[]>;
    activate(id: string, user: any): Promise<{
        activated: boolean;
    }>;
    cancelGuarantee(id: string, user: any): Promise<{
        status: string;
    }>;
    guarantee(id: string, user: any, dto: BidGuaranteeDto): Promise<{
        clientSecret: string;
        amount: number;
        required: number;
        status: string;
    } | {
        status: string;
        amount: number;
        required: number;
        clientSecret?: undefined;
    }>;
    order(id: string, user: any): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
    status(user: any): Promise<{
        identity: {
            status: string;
            verifiedAt: Date;
            errorCode: string;
        };
        sellerPayments: {
            connected: boolean;
            detailsSubmitted: boolean;
            transfersEnabled: boolean;
            payoutsEnabled: boolean;
        };
        mode: string;
        enabled: boolean;
    }>;
    identity(user: any): Promise<{
        status: "processing" | "verified" | import("stripe/cjs/shared").OtherString;
        url?: undefined;
    } | {
        status: import("stripe/cjs/resources/Identity").VerificationSession.Status;
        url: string;
    }>;
    connect(user: any): Promise<{
        url: string;
        expiresAt: number;
    }>;
    reviewQueue(): Promise<{
        issueCode: string;
        reviewCode: string;
        refundReason: string;
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }[]>;
    mine(user: any): Promise<any[]>;
    create(id: string, user: any): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
    payment(id: string, user: any): Promise<{
        status: string;
        clientSecret?: undefined;
    } | {
        clientSecret: string;
        status: "processing" | import("stripe/cjs/shared").OtherString | "requires_action" | "requires_capture" | "requires_confirmation" | "requires_payment_method";
    }>;
    shipment(id: string, user: any, dto: ShipmentDto): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
    receipt(id: string, user: any): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
    issue(id: string, user: any, dto: OrderIssueDto): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
    refund(id: string, user: any, dto: OrderRefundDto): Promise<{
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
        currency: any;
        status: any;
        paymentDeadline: any;
        carrier: any;
        trackingCode: any;
        deliveredAt: any;
        releaseAfter: any;
        issueOpen: any;
        refundedAmount: any;
    }>;
}
export declare class CommerceWebhooksController {
    private readonly stripe;
    private readonly worker;
    constructor(stripe: StripeClientService, worker: CommerceWorker);
    receive(request: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
    receiveConnect(request: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
