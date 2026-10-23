import { CommerceReturnController } from "./commerce-return.controller";
import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../users/schemas/user.schema";
import { Product, ProductSchema } from "../products/schemas/product.schema";
import { Bid, BidSchema } from "../bids/schemas/bid.schema";
import {
  CommerceAccount,
  CommerceAccountSchema,
  CommerceOrder,
  CommerceOrderSchema,
  StripeInbox,
  StripeInboxSchema,
  CommerceLock,
  CommerceLockSchema,
} from "./commerce.schemas";
import { StripeClientService } from "./stripe-client.service";
import { CommerceLockService } from "./commerce-lock.service";
import { CommerceAccountsService } from "./commerce-accounts.service";
import { CommerceOrdersService } from "./commerce-orders.service";
import {
  CommerceController,
  CommerceWebhooksController,
  StripeHttpFilter,
} from "./commerce.controller";
import { CommerceWorker } from "./commerce.worker";
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Bid.name, schema: BidSchema },
      { name: CommerceAccount.name, schema: CommerceAccountSchema },
      { name: CommerceOrder.name, schema: CommerceOrderSchema },
      { name: StripeInbox.name, schema: StripeInboxSchema },
      { name: CommerceLock.name, schema: CommerceLockSchema },
    ]),
  ],
  providers: [
    StripeClientService,
    CommerceLockService,
    CommerceAccountsService,
    CommerceOrdersService,
    CommerceWorker,
    StripeHttpFilter,
  ],
  controllers: [
    CommerceController,
    CommerceWebhooksController,
    CommerceReturnController,
  ],
  exports: [
    CommerceAccountsService,
    CommerceOrdersService,
    StripeClientService,
  ],
})
export class CommerceModule {}
