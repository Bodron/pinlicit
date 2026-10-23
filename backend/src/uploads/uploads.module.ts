import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { ImageAsset, ImageAssetSchema } from "./image-asset.schema";
import { ImageOptimizer } from "./image-optimizer.service";
import { ImageCapacityInterceptor } from "./image-capacity.interceptor";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImageAsset.name, schema: ImageAssetSchema },
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, ImageOptimizer, ImageCapacityInterceptor],
  exports: [UploadsService],
})
export class UploadsModule {}
