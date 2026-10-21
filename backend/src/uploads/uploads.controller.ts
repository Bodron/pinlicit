import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { UserRole } from "../users/schemas/user.schema";
import { CreateVideoUploadDto } from "./dto/create-video-upload.dto";
import { UploadsService } from "./uploads.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Seller, UserRole.Admin)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("video-url")
  createVideoUrl(@Body() dto: CreateVideoUploadDto) {
    return this.uploadsService.createVideoUpload(dto.fileName, dto.contentType);
  }
}
