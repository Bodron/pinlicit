import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSellerApplicationDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsString()
  @MinLength(6)
  contactPhone: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
