import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "./admin/admin.module";
import { AuctionsModule } from "./auctions/auctions.module";
import { AuthModule } from "./auth/auth.module";
import { BidsModule } from "./bids/bids.module";
import { CategoriesModule } from "./categories/categories.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { ProductsModule } from "./products/products.module";
import { SellerApplicationsModule } from "./seller-applications/seller-applications.module";
import { UploadsModule } from "./uploads/uploads.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>("MONGODB_URI") ||
          "mongodb://localhost:27017/licit",
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    SellerApplicationsModule,
    ProductsModule,
    BidsModule,
    FavoritesModule,
    AuctionsModule,
    UploadsModule,
    AdminModule,
  ],
})
export class AppModule {}
