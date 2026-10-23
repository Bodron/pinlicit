import { Type } from "class-transformer";
import {
  IsDateString,
  IsMongoId,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
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
  @Matches(/^images\/v1\/[a-f0-9]{64}\/\d+x\d+\.webp$/)
  imageKey: string;

  @IsUrl({ protocols: ["https"], require_protocol: true })
  @Matches(/\.(jpg|jpeg|png|webp)$/i)
  imageUrl: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  startingPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservePrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minBidIncrement: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  buyNowPrice: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
