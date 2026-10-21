import { Type } from "class-transformer";
import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsMongoId()
  categoryId: string;

  @IsString()
  videoKey: string;

  @IsString()
  videoUrl: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  startingPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reservePrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minBidIncrement: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  buyNowPrice: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
