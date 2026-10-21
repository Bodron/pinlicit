import { IsOptional, IsString, Matches } from "class-validator";

export class CreateVideoUploadDto {
  @IsString()
  fileName: string;

  @IsOptional()
  @IsString()
  @Matches(/^video\//)
  contentType = "video/mp4";
}
