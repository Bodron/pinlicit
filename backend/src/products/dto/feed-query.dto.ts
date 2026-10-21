import { Type } from "class-transformer";
import { IsMongoId, IsOptional, IsPositive, Max } from "class-validator";

export class FeedQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(50)
  limit = 20;
}
