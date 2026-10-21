import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuctionsModule } from "../auctions/auctions.module";
import { ProductsModule } from "../products/products.module";
import { Bid, BidSchema } from "./schemas/bid.schema";
import { BidsController } from "./bids.controller";
import { BidsService } from "./bids.service";

@Module({
  imports: [
    forwardRef(() => ProductsModule),
    forwardRef(() => AuctionsModule),
    MongooseModule.forFeature([{ name: Bid.name, schema: BidSchema }]),
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService, MongooseModule],
})
export class BidsModule {}
