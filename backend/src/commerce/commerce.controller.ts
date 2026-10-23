import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseFilters,
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import Stripe = require("stripe");
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { UserRole } from "../users/schemas/user.schema";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceOrdersService } from "./commerce-orders.service";
import { CommerceWorker } from "./commerce.worker";
import { OrderIssueDto, OrderRefundDto, ShipmentDto } from "./commerce.dto";
import { StripeClientService } from "./stripe-client.service";

@Catch(Stripe.errors.StripeError)
export class StripeHttpFilter implements ExceptionFilter {
  catch(_: unknown, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .setHeader("Cache-Control", "private, no-store");
    host.switchToHttp().getResponse<Response>().status(503).json({
      statusCode: 503,
      message: "Payment provider is unavailable. Retry shortly.",
    });
  }
}
// Mongo IDs are validated explicitly without importing a third-party pipe.
import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { Types } from "mongoose";
@Injectable()
export class CommerceIdPipe implements PipeTransform {
  transform(value: string) {
    if (!/^[a-f\d]{24}$/i.test(value) || !Types.ObjectId.isValid(value))
      throw new BadRequestException("Invalid identifier.");
    return value;
  }
}
@Injectable()
export class CommercePrivateHeaders implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader("Cache-Control", "private, no-store");
    return next.handle();
  }
}
@UseInterceptors(CommercePrivateHeaders)
@UseGuards(JwtAuthGuard)
@UseFilters(StripeHttpFilter)
@Controller("commerce")
export class CommerceController {
  constructor(
    private readonly accounts: CommerceAccountsService,
    private readonly orders: CommerceOrdersService,
  ) {}
  @Get("me") status(@CurrentUser() user: any) {
    return this.accounts.status(String(user._id));
  }
  @Post("identity/session") identity(@CurrentUser() user: any) {
    return this.accounts.startIdentity(String(user._id));
  }
  @Post("seller/onboarding") connect(@CurrentUser() user: any) {
    return this.accounts.startConnect(user);
  }
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Get("review-queue")
  reviewQueue() {
    return this.orders.reviewQueue();
  }
  @Get("orders") mine(@CurrentUser() user: any) {
    return this.orders.mine(String(user._id));
  }
  @Post("products/:id/order") create(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.orders.create(id, String(user._id));
  }
  @Post("orders/:id/payment") payment(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.orders.payment(id, String(user._id));
  }
  @Post("orders/:id/shipment") shipment(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ShipmentDto,
  ) {
    return this.orders.shipped(
      id,
      String(user._id),
      dto.carrier,
      dto.trackingCode,
    );
  }
  @Post("orders/:id/receipt") receipt(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.orders.delivered(id, String(user._id));
  }
  @Post("orders/:id/issues") issue(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: OrderIssueDto,
  ) {
    return this.orders.issue(id, String(user._id), dto.code);
  }
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Post("orders/:id/refund")
  refund(
    @Param("id", CommerceIdPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: OrderRefundDto,
  ) {
    return this.orders.refund(id, dto.reason, String(user._id));
  }
}
@UseFilters(StripeHttpFilter)
@Controller("commerce/webhooks")
export class CommerceWebhooksController {
  constructor(
    private readonly stripe: StripeClientService,
    private readonly worker: CommerceWorker,
  ) {}
  @HttpCode(200)
  @Post("stripe")
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.worker.enqueue(this.stripe.event(request.rawBody, signature));
  }
  @HttpCode(200)
  @Post("connect")
  receiveConnect(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.worker.enqueue(
      this.stripe.event(request.rawBody, signature, true),
    );
  }
}
