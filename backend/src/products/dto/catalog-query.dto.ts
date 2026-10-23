import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
export class CatalogQueryDto {
  @IsOptional() @IsMongoId() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) limit = 12;
  @IsOptional() @IsIn(["ending", "newest", "price-desc", "price-asc"]) sort =
    "ending";
  @IsOptional() @IsIn(["all", "live", "ending", "reserve", "upcoming"]) stage =
    "all";
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000000)
  minPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000000)
  maxPrice?: number;
}
