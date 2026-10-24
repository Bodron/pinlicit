import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { MAX_IMAGE_BYTES } from "./image-policy";
import { ImageCapacityInterceptor } from "./image-capacity.interceptor";
import { UploadsService } from "./uploads.service";

@UseGuards(JwtAuthGuard)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("images")
  @UseInterceptors(
    ImageCapacityInterceptor,
    FileInterceptor("image", {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 2 },
      fileFilter: (_request, file, callback) =>
        callback(
          ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
            ? null
            : new BadRequestException("Use JPG, PNG or WebP."),
          true,
        ),
    }),
  )
  upload(@CurrentUser() user: any, @UploadedFile() image: Express.Multer.File) {
    if (!image?.buffer?.length)
      throw new BadRequestException("An image is required.");
    return this.uploadsService.uploadImage(String(user._id), image.buffer);
  }
}
