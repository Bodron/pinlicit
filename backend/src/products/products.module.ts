import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuctionsModule } from "../auctions/auctions.module";
import { BidsModule } from "../bids/bids.module";
import { CategoriesModule } from "../categories/categories.module";
import { UsersModule } from "../users/users.module";
import { Product, ProductSchema } from "./schemas/product.schema";
import { MyProductsController } from "./my-products.controller";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [
    UsersModule,
    CategoriesModule,
    forwardRef(() => AuctionsModule),
    forwardRef(() => BidsModule),
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductsController, MyProductsController],
  providers: [ProductsService],
  exports: [ProductsService, MongooseModule],
})
export class ProductsModule {}
