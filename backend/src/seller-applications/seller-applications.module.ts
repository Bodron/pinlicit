import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UsersModule } from "../users/users.module";
import {
  SellerApplication,
  SellerApplicationSchema,
} from "./schemas/seller-application.schema";
import { SellerApplicationsController } from "./seller-applications.controller";
import { SellerApplicationsService } from "./seller-applications.service";

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: SellerApplication.name, schema: SellerApplicationSchema },
    ]),
  ],
  controllers: [SellerApplicationsController],
  providers: [SellerApplicationsService],
  exports: [SellerApplicationsService, MongooseModule],
})
export class SellerApplicationsModule {}
