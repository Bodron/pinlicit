import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Optional,
} from "@nestjs/common";
import { CommerceOrdersService } from "../commerce/commerce-orders.service";
import { AuctionsGateway } from "../auctions/auctions.gateway";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { BidsService } from "../bids/bids.service";
import { PlaceBidDto } from "../bids/dto/place-bid.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { FeedQueryDto } from "./dto/feed-query.dto";
import { CatalogQueryDto } from "./dto/catalog-query.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly bidsService: BidsService,
    private readonly auctionsGateway: AuctionsGateway,
    @Optional() private readonly commerceOrders?: CommerceOrdersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(user, dto);
  }

  @Get("feed")
  feed(@Query() query: FeedQueryDto) {
    return this.productsService.feed(query);
  }

  @Get("catalog")
  catalog(@Query() query: CatalogQueryDto) {
    return this.productsService.catalog(query);
  }

  @Get(":id")
  find(@Param("id") id: string) {
    return this.productsService.findPublic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/bids")
  placeBid(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: PlaceBidDto,
  ) {
    return this.bidsService.placeBid(id, user._id.toString(), dto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/buy-now")
  async buyNow(@Param("id") id: string, @CurrentUser() user: any) {
    const product = await this.productsService.reserveByBuyNow(
      id,
      user._id.toString(),
    );
    if (product.commerceVersion === 1) {
      await this.commerceOrders.create(String(product._id), String(user._id));
    }
    this.auctionsGateway.broadcastClosed(product);
    return product;
  }
}
