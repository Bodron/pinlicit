import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { SellerApplicationsModule } from "../seller-applications/seller-applications.module";
import { UsersModule } from "../users/users.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [SellerApplicationsModule, ProductsModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
