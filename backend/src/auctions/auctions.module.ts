import { forwardRef, Module } from "@nestjs/common";
import { BidsModule } from "../bids/bids.module";
import { ProductsModule } from "../products/products.module";
import { AuctionsGateway } from "./auctions.gateway";

@Module({
  imports: [forwardRef(() => ProductsModule), forwardRef(() => BidsModule)],
  providers: [AuctionsGateway],
  exports: [AuctionsGateway],
})
export class AuctionsModule {}
